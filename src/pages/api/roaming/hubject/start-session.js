/**
 * API: Hubject StartSession (OICP INBOUND)
 * Creates an INBOUND roaming session when external driver starts charging
 * 
 * POST /api/roaming/hubject/start-session
 * Body: { hubjectSessionId, empId, rfidToken, stationId, connectorId, meterStart, timestamp }
 */

import { validateInternalService } from '@/lib/server/internal-service-auth';
import { createInboundSession } from '@/prisma/services/roamingHubject';

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

    const {
      hubjectSessionId,
      empId,
      rfidToken,
      stationId,
      connectorId,
      meterStart,
      timestamp,
      roamingTariff,
    } = req.body;

    if (!hubjectSessionId || !empId || !stationId || !connectorId) {
      return res.status(400).json({
        errors: {
          hubjectSessionId: { msg: 'hubjectSessionId is required' },
          empId: { msg: 'empId is required' },
          stationId: { msg: 'stationId is required' },
          connectorId: { msg: 'connectorId is required' },
        },
      });
    }

    // Get workspace from station
    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
      select: { workspaceId: true },
    });

    if (!station) {
      return res.status(404).json({
        errors: { station: { msg: 'Station not found' } },
      });
    }

    // Create INBOUND session
    const session = await createInboundSession({
      workspaceId: station.workspaceId,
      stationId,
      connectorId,
      hubjectSessionId,
      empId,
      rfidToken,
      meterStart: meterStart || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      roamingTariff,
    });

    return res.status(201).json({
      data: {
        sessionId: session.id,
        hubjectSessionId: session.hubjectSessionId,
        roamingType: session.roamingType,
        status: session.status,
      },
    });
  } catch (error) {
    console.error('[api/roaming/hubject/start-session] Error:', error);
    
    // Handle idempotency (session already exists)
    if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
      // Try to find existing session
      try {
        const existing = await prisma.chargingSession.findUnique({
          where: { hubjectSessionId: req.body.hubjectSessionId },
        });
        if (existing) {
          return res.status(200).json({
            data: {
              sessionId: existing.id,
              hubjectSessionId: existing.hubjectSessionId,
              roamingType: existing.roamingType,
              status: existing.status,
              alreadyExists: true,
            },
          });
        }
      } catch (e) {
        // Fall through to error response
      }
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
