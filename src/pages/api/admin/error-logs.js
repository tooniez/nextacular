/**
 * Super Admin Error Logs API
 * GET: Get all error logs (OpsEvents)
 * DELETE: Delete error logs
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
      const severity = req.query.severity || 'all'; // all, INFO, WARN, ERROR, CRITICAL
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;

      // Build where clause
      const where = {};

      // Severity filter
      if (severity && severity !== 'all') {
        // Map Italian names to enum values
        const severityMap = {
          'Successo': 'INFO',
          'Informazione': 'INFO',
          'Avvertimento': 'WARN',
          'Errore': 'ERROR',
          'Debug': 'INFO',
        };
        where.severity = severityMap[severity] || severity;
      }

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
        // Map severity to Italian display names
        const severityMap = {
          'INFO': 'Informazione',
          'WARN': 'Avvertimento',
          'ERROR': 'Errore',
          'CRITICAL': 'Errore',
        };

        return {
          id: event.id,
          type: event.severity,
          typeFormatted: severityMap[event.severity] || event.severity,
          date: event.createdAt,
          message: event.message,
          title: event.title,
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
      console.error('GET /api/admin/error-logs error:', error);
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

      // Delete all error logs
      await prisma.opsEvent.deleteMany({});

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/admin/error-logs error:', error);
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
