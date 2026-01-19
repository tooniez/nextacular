/**
 * Super Admin Stations API
 * GET: Get all stations from all workspaces
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { StationStatus } from '@prisma/client';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get query params
      const search = req.query.search || '';
      const status = req.query.status || null;
      const network = req.query.network || 'all'; // 'all' or workspace slug
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      // Build where clause
      const where = {};
      
      // Search filter
      if (search) {
        where.OR = [
          { ocppId: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Status filter
      if (status && Object.values(StationStatus).includes(status)) {
        where.status = status;
      }

      // Network filter
      if (network && network !== 'all') {
        const workspace = await prisma.workspace.findFirst({
          where: { slug: network },
        });
        if (workspace) {
          where.workspaceId = workspace.id;
        }
      }

      // Get total count
      const total = await prisma.chargingStation.count({ where });

      // Get stations with pagination
      const stations = await prisma.chargingStation.findMany({
        where,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          connectors: true, // Include all connector fields
        },
        orderBy: [
          { lastHeartbeat: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Format response
      const formattedStations = stations.map((station) => {
        const connectors = station.connectors || [];
        const availableConnectors = connectors.filter(c => c.status === 'AVAILABLE').length;
        const totalConnectors = connectors.length;

        return {
          id: station.id,
          ocppId: station.ocppId,
          name: station.name,
          location: station.location,
          latitude: station.latitude,
          longitude: station.longitude,
          status: station.status,
          ocppVersion: station.ocppVersion,
          model: station.model, // OCPP model from BootNotification
          vendor: station.vendor, // OCPP vendor
          firmwareVersion: station.firmwareVersion, // OCPP firmware
          lastHeartbeat: station.lastHeartbeat,
          createdAt: station.createdAt,
          workspace: station.workspace,
          connectors: {
            total: totalConnectors,
            available: availableConnectors,
            list: connectors.map(conn => ({
              id: conn.id,
              connectorId: conn.connectorId,
              status: conn.status,
              maxPower: conn.maxPower,
              connectorType: conn.connectorType,
              energyType: conn.energyType,
            })),
          },
        };
      });

      res.status(200).json({
        data: formattedStations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/stations error:', error);

      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
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
