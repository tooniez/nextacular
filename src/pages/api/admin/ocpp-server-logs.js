/**
 * Super Admin OCPP Server Logs API
 * GET: Get OCPP server logs (OpsEvents filtered by OCPP resource type)
 * DELETE: Delete OCPP server logs
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
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;

      // Build where clause - filter for OCPP-related events
      const where = {
        OR: [
          { resourceType: 'OCPP' },
          { eventType: { contains: 'OCPP', mode: 'insensitive' } },
          { eventType: { contains: 'Roaming', mode: 'insensitive' } },
          { message: { contains: 'OCPP', mode: 'insensitive' } },
        ],
      };

      // Get total count
      const total = await prisma.opsEvent.count({ where });

      // Get events
      const events = await prisma.opsEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Format response
      const formattedLogs = events.map((event) => {
        // Determine log type icon based on severity and content
        let logType = 'INFO';
        if (event.severity === 'ERROR' || event.severity === 'CRITICAL') {
          logType = 'ERROR';
        } else if (event.severity === 'WARN') {
          logType = 'WARN';
        } else if (event.message?.includes('Connected') || event.message?.includes('Success')) {
          logType = 'SUCCESS';
        }

        return {
          id: event.id,
          type: logType,
          date: event.createdAt,
          message: event.message,
          title: event.title,
          severity: event.severity,
          eventType: event.eventType,
          context: event.context,
        };
      });

      res.status(200).json({
        data: formattedLogs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/ocpp-server-logs error:', error);
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

      // Delete OCPP server logs
      const where = {
        OR: [
          { resourceType: 'OCPP' },
          { eventType: { contains: 'OCPP', mode: 'insensitive' } },
        ],
      };

      await prisma.opsEvent.deleteMany({ where });

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/admin/ocpp-server-logs error:', error);
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
