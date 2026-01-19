/**
 * Payment Service - Stripe PaymentIntent with Manual Capture
 * Handles HOLD (pre-auth) and CAPTURE operations
 * 
 * IMPORTANT: All operations are idempotent
 */

import Stripe from 'stripe';
import prisma from '@/prisma/index';

// Initialize Stripe (use secret key from env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Convert EUR amount to cents
 * @param {number} amount - Amount in EUR
 * @returns {number} Amount in cents
 */
function eurToCents(amount) {
  return Math.round(amount * 100);
}

/**
 * Convert cents to EUR amount
 * @param {number} cents - Amount in cents
 * @returns {number} Amount in EUR
 */
function centsToEur(cents) {
  return cents / 100;
}

/**
 * Create PaymentIntent with HOLD (pre-auth)
 * @param {object} params
 * @param {string} params.endUserId - EndUser ID
 * @param {number} params.amountEur - Amount in EUR to hold
 * @param {string} params.currency - Currency (default: EUR)
 * @param {string} params.sessionId - ChargingSession ID (for metadata)
 * @returns {Promise<object>} { paymentIntentId, status, error }
 */
export async function createPaymentHold({ endUserId, amountEur, currency = 'EUR', sessionId }) {
  try {
    // Get EndUser with PaymentProfile
    const endUser = await prisma.endUser.findUnique({
      where: { id: endUserId },
      include: { paymentProfile: true },
    });

    if (!endUser) {
      return { error: 'EndUser not found', status: 'FAILED' };
    }

    if (!endUser.paymentProfile?.stripeCustomerId) {
      return { error: 'No Stripe customer ID found', status: 'FAILED' };
    }

    if (!endUser.paymentProfile?.stripePaymentMethodId) {
      return { error: 'No payment method found', status: 'FAILED' };
    }

    const amountCents = eurToCents(amountEur);

    // Create PaymentIntent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      customer: endUser.paymentProfile.stripeCustomerId,
      payment_method: endUser.paymentProfile.stripePaymentMethodId,
      capture_method: 'manual', // Manual capture required
      confirm: true, // Confirm immediately to hold funds
      metadata: {
        endUserId,
        sessionId: sessionId || '',
        type: 'charging_session_hold',
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status === 'requires_capture' ? 'HOLD_OK' : 'HOLD_PENDING',
      amountCents,
      currency,
    };
  } catch (error) {
    return {
      error: error.message,
      errorCode: error.code || error.type,
      status: 'FAILED',
    };
  }
}

/**
 * Capture PaymentIntent (full or partial)
 * @param {object} params
 * @param {string} params.paymentIntentId - Stripe PaymentIntent ID
 * @param {number} params.amountEur - Amount to capture in EUR (optional, defaults to full)
 * @returns {Promise<object>} { captured, status, error }
 */
export async function capturePayment({ paymentIntentId, amountEur = null }) {
  try {
    // Get PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Already captured (idempotency)
      return {
        captured: true,
        status: 'CAPTURED',
        amountCents: paymentIntent.amount_captured || paymentIntent.amount,
        alreadyCaptured: true,
      };
    }

    if (paymentIntent.status !== 'requires_capture') {
      return {
        error: `PaymentIntent status is ${paymentIntent.status}, cannot capture`,
        status: 'FAILED',
      };
    }

    // Capture (full or partial)
    const captureParams = {};
    if (amountEur !== null) {
      captureParams.amount_to_capture = eurToCents(amountEur);
    }

    const captured = await stripe.paymentIntents.capture(paymentIntentId, captureParams);

    return {
      captured: true,
      status: 'CAPTURED',
      amountCents: captured.amount_captured || captured.amount,
      currency: captured.currency,
    };
  } catch (error) {
    return {
      error: error.message,
      errorCode: error.code || error.type,
      status: 'FAILED',
    };
  }
}

/**
 * Release PaymentIntent (cancel HOLD)
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @returns {Promise<object>} { released, error }
 */
export async function releasePaymentHold(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Already captured, cannot release
      return { error: 'Payment already captured, cannot release', released: false };
    }

    if (paymentIntent.status === 'canceled') {
      // Already canceled (idempotency)
      return { released: true, alreadyReleased: true };
    }

    // Cancel PaymentIntent to release hold
    await stripe.paymentIntents.cancel(paymentIntentId);

    return { released: true };
  } catch (error) {
    return {
      error: error.message,
      errorCode: error.code || error.type,
      released: false,
    };
  }
}

/**
 * Update ChargingSession payment status (idempotent)
 * @param {string} sessionId - ChargingSession ID
 * @param {object} paymentData - Payment data to update
 * @returns {Promise<object>} Updated session
 */
export async function updateSessionPaymentStatus(sessionId, paymentData) {
  const { paymentStatus, stripePaymentIntentId, holdAmountCents, capturedAmountCents, paymentLastErrorCode, paymentLastErrorMessage, paidAt } = paymentData;

  // Get current session to check if update is needed (idempotency)
  const currentSession = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: { paymentStatus: true, stripePaymentIntentId: true },
  });

  if (!currentSession) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // If already in target state, skip update (idempotency)
  if (paymentStatus && currentSession.paymentStatus === paymentStatus) {
    if (stripePaymentIntentId && currentSession.stripePaymentIntentId === stripePaymentIntentId) {
      return currentSession;
    }
  }

  // Update session
  const updated = await prisma.chargingSession.update({
    where: { id: sessionId },
    data: {
      paymentStatus: paymentStatus || undefined,
      stripePaymentIntentId: stripePaymentIntentId || undefined,
      holdAmountCents: holdAmountCents || undefined,
      capturedAmountCents: capturedAmountCents || undefined,
      paymentLastErrorCode: paymentLastErrorCode || undefined,
      paymentLastErrorMessage: paymentLastErrorMessage || undefined,
      paidAt: paidAt || undefined,
    },
  });

  return updated;
}

/**
 * Get PaymentIntent status from Stripe
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @returns {Promise<object>} PaymentIntent status
 */
export async function getPaymentIntentStatus(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amountCaptured: paymentIntent.amount_captured,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    return {
      error: error.message,
      errorCode: error.code || error.type,
    };
  }
}
