/**
 * Super Admin Station Detail API
 * GET: Get single station by ID (all workspaces)
 * PATCH: Update station
 * DELETE: Delete station
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get station with all relations
      const station = await prisma.chargingStation.findUnique({
        where: { id },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          connectors: {
            orderBy: { connectorId: 'asc' },
          },
        },
      });

      if (!station) {
        return res.status(404).json({
          errors: { station: { msg: 'Station not found' } },
        });
      }

      res.status(200).json({ data: station });
    } catch (error) {
      console.error('GET /api/admin/stations/[id] error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'PATCH') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const updateData = req.body || {};

      // Update station
      const station = await prisma.chargingStation.update({
        where: { id },
        data: {
          name: updateData.name,
          location: updateData.location,
          latitude: updateData.latitude !== undefined ? parseFloat(updateData.latitude) : undefined,
          longitude: updateData.longitude !== undefined ? parseFloat(updateData.longitude) : undefined,
          status: updateData.status,
          ocppVersion: updateData.ocppVersion,
          vendor: updateData.vendor,
          model: updateData.model,
          firmwareVersion: updateData.firmwareVersion,
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          connectors: {
            orderBy: { connectorId: 'asc' },
          },
        },
      });

      res.status(200).json({ data: station });
    } catch (error) {
      console.error('PATCH /api/admin/stations/[id] error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({
          errors: { station: { msg: 'Station not found' } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'DELETE') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      await prisma.chargingStation.delete({
        where: { id },
      });

      res.status(200).json({ data: { id } });
    } catch (error) {
      console.error('DELETE /api/admin/stations/[id] error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({
          errors: { station: { msg: 'Station not found' } },
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
