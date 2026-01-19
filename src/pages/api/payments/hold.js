/**
 * API: Create Payment HOLD (pre-auth)
 * Called before StartTransaction to ensure payment method is valid
 * 
 * POST /api/payments/hold
 * Body: { endUserId, amountEur, currency?, sessionId? }
 */

import { validateSession } from '@/config/api-validation';
import { createPaymentHold, updateSessionPaymentStatus } from '@/prisma/services/payment';

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
    const { endUserId, amountEur, currency = 'EUR', sessionId } = req.body;

    if (!endUserId || amountEur === undefined) {
      return res.status(400).json({
        errors: {
          endUserId: { msg: 'endUserId is required' },
          amountEur: { msg: 'amountEur is required' },
        },
      });
    }

    if (amountEur <= 0) {
      return res.status(400).json({
        errors: { amountEur: { msg: 'amountEur must be greater than 0' } },
      });
    }

    // Create HOLD
    const holdResult = await createPaymentHold({
      endUserId,
      amountEur,
      currency,
      sessionId,
    });

    if (holdResult.error) {
      // Update session if sessionId provided
      if (sessionId) {
        await updateSessionPaymentStatus(sessionId, {
          paymentStatus: 'FAILED',
          paymentLastErrorCode: holdResult.errorCode,
          paymentLastErrorMessage: holdResult.error,
        });
      }

      return res.status(400).json({
        errors: { payment: { msg: holdResult.error } },
        errorCode: holdResult.errorCode,
      });
    }

    // Update session if sessionId provided
    if (sessionId) {
      await updateSessionPaymentStatus(sessionId, {
        paymentStatus: holdResult.status,
        stripePaymentIntentId: holdResult.paymentIntentId,
        holdAmountCents: holdResult.amountCents,
        currency: holdResult.currency,
      });
    }

    return res.status(200).json({
      data: {
        paymentIntentId: holdResult.paymentIntentId,
        status: holdResult.status,
        amountCents: holdResult.amountCents,
        currency: holdResult.currency,
      },
    });
  } catch (error) {
    console.error('[api/payments/hold] Error:', error);
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
