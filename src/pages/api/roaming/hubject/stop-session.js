/**
 * API: Hubject StopSession (OICP INBOUND)
 * Closes an INBOUND roaming session when external driver stops charging
 * 
 * POST /api/roaming/hubject/stop-session
 * Body: { hubjectSessionId, meterStop, timestamp, stopReason }
 */

import { validateInternalService } from '@/lib/server/internal-service-auth';
import { closeInboundSession } from '@/prisma/services/roamingHubject';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify internal service call (or Hubject signature in production)
    const isInternalService = validateInternalService(req);
    if (!isInternalService) {
      return res.status(401).json({
        errors: { auth: { msg: 'Unauthorized: Invalid service token' } },
      });
    }

    const { hubjectSessionId, meterStop, timestamp, stopReason } = req.body;

    if (!hubjectSessionId) {
      return res.status(400).json({
        errors: { hubjectSessionId: { msg: 'hubjectSessionId is required' } },
      });
    }

    // Find session
    const session = await prisma.chargingSession.findUnique({
      where: { hubjectSessionId },
    });

    if (!session) {
      return res.status(404).json({
        errors: { session: { msg: 'Session not found' } },
      });
    }

    if (session.roamingType !== 'INBOUND') {
      return res.status(400).json({
        errors: { session: { msg: 'Session is not an INBOUND roaming session' } },
      });
    }

    // Close session
    const closedSession = await closeInboundSession(session.id, {
      meterStop,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      stopReason: stopReason || 'EV_DISCONNECTED',
    });

    return res.status(200).json({
      data: {
        sessionId: closedSession.id,
        status: closedSession.status,
        billingStatus: closedSession.billingStatus,
        clearingStatus: closedSession.clearingStatus,
        grossAmount: closedSession.grossAmount,
        energyKwh: closedSession.energyKwh,
        durationSeconds: closedSession.durationSeconds,
      },
    });
  } catch (error) {
    console.error('[api/roaming/hubject/stop-session] Error:', error);
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
