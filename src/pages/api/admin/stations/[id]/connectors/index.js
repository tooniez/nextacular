/**
 * Super Admin Station Connectors API
 * GET: Get all connectors for a station
 * POST: Create new connector
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { ConnectorStatus } from '@prisma/client';

const handler = async (req, res) => {
  const { method } = req;
  const { id: stationId } = req.query;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get connectors for station
      const connectors = await prisma.connector.findMany({
        where: { stationId },
        orderBy: { connectorId: 'asc' },
      });

      res.status(200).json({ data: connectors });
    } catch (error) {
      console.error('GET /api/admin/stations/[id]/connectors error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'POST') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { connectorId, name, maxPower, connectorType, status } = req.body;

      // Check if connectorId already exists for this station
      const existing = await prisma.connector.findFirst({
        where: {
          stationId,
          connectorId: parseInt(connectorId),
        },
      });

      if (existing) {
        return res.status(409).json({
          errors: { connectorId: { msg: 'Connector with this ID already exists for this station' } },
        });
      }

      const connector = await prisma.connector.create({
        data: {
          stationId,
          connectorId: parseInt(connectorId),
          name,
          maxPower: maxPower ? parseFloat(maxPower) : null,
          connectorType,
          status: status || ConnectorStatus.AVAILABLE,
        },
      });

      res.status(201).json({ data: connector });
    } catch (error) {
      console.error('POST /api/admin/stations/[id]/connectors error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({
          errors: { connectorId: { msg: 'Connector ID already exists' } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
