/**
 * API: Hubject Authorize (OICP)
 * Handles authorization requests from Hubject for roaming sessions
 * 
 * POST /api/roaming/hubject/authorize
 * Body: { empId, rfidToken, stationId, connectorId }
 * 
 * NOTE: This is a private API endpoint for Hubject.
 * In production, it should be protected with Hubject API key/signature verification.
 */

import { validateInternalService } from '@/lib/server/internal-service-auth';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify internal service call (or Hubject signature in production)
    const isInternalService = validateInternalService(req);
    if (!isInternalService) {
      // In production, verify Hubject signature here
      // For now, allow internal service only
      return res.status(401).json({
        errors: { auth: { msg: 'Unauthorized: Invalid service token' } },
      });
    }

    const { empId, rfidToken, stationId, connectorId } = req.body;

    if (!empId || !rfidToken) {
      return res.status(400).json({
        errors: {
          empId: { msg: 'empId is required' },
          rfidToken: { msg: 'rfidToken is required' },
        },
      });
    }

    // Find station
    const station = await prisma.chargingStation.findFirst({
      where: {
        id: stationId,
        deletedAt: null,
      },
      include: {
        connector: {
          where: { id: connectorId },
        },
      },
    });

    if (!station) {
      return res.status(404).json({
        errors: { station: { msg: 'Station not found' } },
      });
    }

    // Check if connector is available
    if (station.connector.length === 0) {
      return res.status(404).json({
        errors: { connector: { msg: 'Connector not found' } },
      });
    }

    const connector = station.connector[0];
    if (connector.status !== 'AVAILABLE' && connector.status !== 'OCCUPIED') {
      return res.status(403).json({
        errors: { connector: { msg: `Connector not available (status: ${connector.status})` } },
      });
    }

    // Authorization successful
    return res.status(200).json({
      data: {
        authorized: true,
        empId,
        stationId: station.id,
        connectorId: connector.id,
        status: connector.status,
      },
    });
  } catch (error) {
    console.error('[api/roaming/hubject/authorize] Error:', error);
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
