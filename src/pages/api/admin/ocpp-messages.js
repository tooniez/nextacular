/**
 * Super Admin OCPP Messages API
 * GET: Get all OCPP messages
 * DELETE: Delete OCPP messages
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get query params
      const type = req.query.type || 'all'; // all, CALL, CALLRESULT
      const stationId = req.query.stationId || 'all';
      const action = req.query.action || 'all';
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;

      // Build where clause
      const where = {};

      // Type filter (direction)
      if (type && type !== 'all') {
        where.direction = type === 'CALL' ? 'IN' : type === 'CALLRESULT' ? 'OUT' : type;
      }

      // Station filter
      if (stationId && stationId !== 'all') {
        where.stationId = stationId;
      }

      // Action filter
      if (action && action !== 'all') {
        where.action = action;
      }

      // Get total count
      const total = await prisma.ocppMessage.count({ where });

      // Get messages
      const messages = await prisma.ocppMessage.findMany({
        where,
        include: {
          station: {
            select: {
              id: true,
              ocppId: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Format response
      const formattedMessages = messages.map((msg) => {
        let payloadDetail = [];
        try {
          const payload = JSON.parse(msg.payload);
          payloadDetail = payload;
        } catch {
          payloadDetail = msg.payload;
        }

        return {
          id: msg.id,
          date: msg.createdAt,
          stationId: msg.stationId,
          stationOcppId: msg.station?.ocppId || msg.chargePointIdentity || 'N/A',
          stationName: msg.station?.name || 'N/A',
          direction: msg.direction,
          directionFormatted: msg.direction === 'IN' ? 'CALL' : msg.direction === 'OUT' ? 'CALLRESULT' : msg.direction,
          ocppId: msg.messageId || msg.id,
          action: msg.action,
          payload: msg.payload,
          payloadDetail,
        };
      });

      res.status(200).json({
        data: formattedMessages,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/ocpp-messages error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
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

      // Delete all OCPP messages (or filtered)
      const where = {};
      
      // Optional filters
      if (req.query.stationId && req.query.stationId !== 'all') {
        where.stationId = req.query.stationId;
      }

      await prisma.ocppMessage.deleteMany({ where });

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/admin/ocpp-messages error:', error);
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
