/**
 * API: Capture Payment
 * Called after StopTransaction when billing is complete
 * 
 * POST /api/payments/capture
 * Body: { sessionId, amountEur? }
 */

import { validateSession } from '@/config/api-validation';
import { capturePayment, updateSessionPaymentStatus } from '@/prisma/services/payment';
import prisma from '@/prisma/index';

/**
 * Validate internal service request (from OCPP server)
 * Checks for X-Internal-Service header or API key
 */
const validateInternalService = (req) => {
  const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-ocpp-service-token';
  const headerToken = req.headers['x-internal-service'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (headerToken === internalServiceToken) {
    return true;
  }
  
  return false;
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Allow internal service calls (from OCPP server) without session
    const isInternalService = validateInternalService(req);
    let session = null;
    
    if (!isInternalService) {
      // Regular API call requires session
      session = await validateSession(req, res);
    }
    const { sessionId, amountEur } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        errors: { sessionId: { msg: 'sessionId is required' } },
      });
    }

    // Get session
    const chargingSession = await prisma.chargingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        stripePaymentIntentId: true,
        paymentStatus: true,
        grossAmount: true,
        holdAmountCents: true,
        billingStatus: true,
      },
    });

    if (!chargingSession) {
      return res.status(404).json({
        errors: { sessionId: { msg: 'Session not found' } },
      });
    }

    // Check if already captured (idempotency)
    if (chargingSession.paymentStatus === 'CAPTURED') {
      return res.status(200).json({
        data: {
          sessionId,
          status: 'CAPTURED',
          alreadyCaptured: true,
          message: 'Payment already captured',
        },
      });
    }

    if (!chargingSession.stripePaymentIntentId) {
      return res.status(400).json({
        errors: { payment: { msg: 'No PaymentIntent found for this session' } },
      });
    }

    // Determine capture amount
    const captureAmountEur = amountEur !== undefined ? amountEur : chargingSession.grossAmount;

    if (!captureAmountEur || captureAmountEur <= 0) {
      return res.status(400).json({
        errors: { amount: { msg: 'Invalid capture amount' } },
      });
    }

    // Capture payment
    const captureResult = await capturePayment({
      paymentIntentId: chargingSession.stripePaymentIntentId,
      amountEur: captureAmountEur,
    });

    if (captureResult.error) {
      // Update session with error
      await updateSessionPaymentStatus(sessionId, {
        paymentStatus: 'FAILED',
        paymentLastErrorCode: captureResult.errorCode,
        paymentLastErrorMessage: captureResult.error,
      });

      return res.status(400).json({
        errors: { payment: { msg: captureResult.error } },
        errorCode: captureResult.errorCode,
      });
    }

    // Check for partial capture
    const holdAmountEur = chargingSession.holdAmountCents ? chargingSession.holdAmountCents / 100 : null;
    let finalStatus = 'CAPTURED';
    if (holdAmountEur && captureAmountEur > holdAmountEur) {
      finalStatus = 'PARTIAL_FAILED';
    }

    // Update session
    await updateSessionPaymentStatus(sessionId, {
      paymentStatus: finalStatus,
      capturedAmountCents: captureResult.amountCents,
      paidAt: new Date(),
    });

    // Release remaining hold if partial
    if (finalStatus === 'CAPTURED' && holdAmountEur && captureAmountEur < holdAmountEur) {
      // Remaining amount will be automatically released by Stripe after capture
      // No action needed
    }

    return res.status(200).json({
      data: {
        sessionId,
        status: finalStatus,
        amountCents: captureResult.amountCents,
        currency: captureResult.currency,
      },
    });
  } catch (error) {
    console.error('[api/payments/capture] Error:', error);
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
