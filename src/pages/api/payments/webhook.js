/**
 * API: Stripe Webhook Handler
 * Handles Stripe events for PaymentIntent status changes
 * 
 * POST /api/payments/webhook
 * Headers: stripe-signature (for verification)
 */

import Stripe from 'stripe';
import { updateSessionPaymentStatus } from '@/prisma/services/payment';
import prisma from '@/prisma/index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  if (!webhookSecret) {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  try {
    stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return true;
  } catch (error) {
    console.error('[webhook] Signature verification failed:', error.message);
    return false;
  }
}

/**
 * Handle webhook event (idempotent)
 * 
 * NOTE: Idempotency is handled by checking session payment status
 * If already in target state, skip update
 */
async function handleWebhookEvent(event) {
  const eventId = event.id;
  
  // Log event for audit
  console.log(`[webhook] Processing event ${eventId} of type ${event.type}`);

  const paymentIntent = event.data.object;

  // Find session by PaymentIntent ID
  const session = await prisma.chargingSession.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    select: { id: true, paymentStatus: true },
  });

  if (!session) {
    console.warn(`[webhook] No session found for PaymentIntent ${paymentIntent.id}`);
    return { processed: false, reason: 'session_not_found' };
  }

  // Handle event types (idempotent: check current status before update)
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Payment captured successfully
      if (session.paymentStatus !== 'CAPTURED') {
        await updateSessionPaymentStatus(session.id, {
          paymentStatus: 'CAPTURED',
          capturedAmountCents: paymentIntent.amount_captured || paymentIntent.amount,
          paidAt: new Date(),
        });
        console.log(`[webhook] Updated session ${session.id} to CAPTURED`);
      } else {
        console.log(`[webhook] Session ${session.id} already CAPTURED, skipping`);
      }
      break;

    case 'payment_intent.payment_failed':
      // Payment failed
      if (session.paymentStatus !== 'FAILED' && session.paymentStatus !== 'CAPTURED') {
        await updateSessionPaymentStatus(session.id, {
          paymentStatus: 'FAILED',
          paymentLastErrorCode: paymentIntent.last_payment_error?.code,
          paymentLastErrorMessage: paymentIntent.last_payment_error?.message,
        });
        console.log(`[webhook] Updated session ${session.id} to FAILED`);
      } else {
        console.log(`[webhook] Session ${session.id} already in final state, skipping`);
      }
      break;

    case 'charge.captured':
      // Charge captured (confirmation)
      if (session.paymentStatus !== 'CAPTURED') {
        await updateSessionPaymentStatus(session.id, {
          paymentStatus: 'CAPTURED',
          capturedAmountCents: paymentIntent.amount_captured || paymentIntent.amount,
          paidAt: new Date(),
        });
        console.log(`[webhook] Updated session ${session.id} to CAPTURED (charge.captured)`);
      } else {
        console.log(`[webhook] Session ${session.id} already CAPTURED, skipping`);
      }
      break;

    default:
      console.log(`[webhook] Unhandled event type: ${event.type}`);
  }

  return { processed: true, sessionId: session.id };
}

// Disable body parsing for webhook (we need raw body for signature verification)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse JSON body
    const event = JSON.parse(rawBody);

    const result = await handleWebhookEvent(event);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error('[webhook] Error processing event:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default handler;
