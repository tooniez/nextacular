/**
 * Super Admin RFID Card Sessions API
 * GET: Get charging sessions for a specific RFID card
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { id } = req.query;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Card ID is required' } },
        });
      }

      // Get user (RFID card owner)
      const user = await prisma.endUser.findUnique({
        where: { id },
        select: {
          id: true,
          rfidToken: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          errors: { card: { msg: 'Card not found' } },
        });
      }

      // Build where clause - sessions for this user or with this RFID token
      const where = {
        OR: [
          { endUserId: id },
          { rfidToken: user.rfidToken },
        ],
      };

      // Get total count
      const total = await prisma.chargingSession.count({ where });

      // Get sessions
      const sessions = await prisma.chargingSession.findMany({
        where,
        include: {
          station: {
            select: {
              id: true,
              ocppId: true,
              name: true,
            },
          },
          connector: {
            select: {
              id: true,
              connectorId: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Format response
      const formattedSessions = sessions.map((session) => {
        // Calculate duration
        const durationSeconds = session.durationSeconds || 
          (session.endTime ? Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000) : null);
        
        const hours = durationSeconds ? Math.floor(durationSeconds / 3600) : 0;
        const minutes = durationSeconds ? Math.floor((durationSeconds % 3600) / 60) : 0;
        const seconds = durationSeconds ? durationSeconds % 60 : 0;
        const durationFormatted = durationSeconds ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : null;

        // Pricing
        const energyKwh = session.energyKwh || 0;
        const pricePerKwh = session.tariffBasePricePerKwh || 0;
        const pricePerMinute = session.tariffPricePerMinute || 0;
        const sessionStartFee = session.tariffSessionStartFee || 0;
        const durationMinutes = durationSeconds ? durationSeconds / 60 : 0;
        
        const revenueFromEnergy = energyKwh * pricePerKwh;
        const revenueFromTime = durationMinutes * pricePerMinute;
        const totalCost = revenueFromEnergy + revenueFromTime + sessionStartFee;

        // Station identifier
        const stationIdentifier = session.station 
          ? `${session.station.ocppId}-${session.connector?.connectorId || ''}`
          : 'N/A';

        return {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          stopReason: session.stopReason,
          stationIdentifier,
          stationName: session.station?.name || 'N/A',
          ocppTransactionId: session.ocppTransactionId,
          energyKwh,
          durationSeconds,
          durationFormatted,
          pricePerKwh,
          pricePerMinute,
          totalCost,
        };
      });

      res.status(200).json({
        data: formattedSessions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/rfid-cards/[id]/sessions error:', error);
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
