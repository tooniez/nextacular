/**
 * Operations Events API
 * GET: Get event timeline with filters
 * POST: Create event (for manual events or system events)
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  try {
    // RBAC: Only Super Admin
    const session = await verifySuperAdmin(req, res);

    if (req.method === 'GET') {
      const {
        resourceId,
        resourceType,
        correlationId,
        stationId,
        sessionId,
        workspaceId,
        eventType,
        severity,
        page = 1,
        pageSize = 50,
      } = req.query;

      const where = {};
      if (resourceId) where.resourceId = resourceId;
      if (resourceType) where.resourceType = resourceType;
      if (correlationId) where.correlationId = correlationId;
      if (stationId) where.stationId = stationId;
      if (sessionId) where.sessionId = sessionId;
      if (workspaceId) where.workspaceId = workspaceId;
      if (eventType) where.eventType = eventType;
      if (severity) where.severity = severity;

      const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

      const [data, total] = await Promise.all([
        prisma.opsEvent.findMany({
          where,
          skip,
          take: parseInt(pageSize, 10),
          orderBy: { createdAt: 'desc' },
          include: {
            station: {
              select: { id: true, name: true, ocppId: true },
            },
            session: {
              select: { id: true, ocppTransactionId: true },
            },
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        }),
        prisma.opsEvent.count({ where }),
      ]);

      return res.status(200).json({
        data: {
          data,
          pagination: {
            page: parseInt(page, 10),
            pageSize: parseInt(pageSize, 10),
            total,
            totalPages: Math.ceil(total / parseInt(pageSize, 10)),
          },
        },
      });
    }

    if (req.method === 'POST') {
      const {
        eventType,
        severity = 'INFO',
        title,
        message,
        context = {},
        resourceId,
        resourceType,
        correlationId,
        stationId,
        sessionId,
        workspaceId,
      } = req.body;

      if (!eventType || !title || !message) {
        return res.status(400).json({
          errors: { validation: { msg: 'eventType, title, and message are required' } },
        });
      }

      const event = await prisma.opsEvent.create({
        data: {
          eventType,
          severity,
          title,
          message,
          context,
          resourceId,
          resourceType,
          correlationId,
          stationId,
          sessionId,
          workspaceId,
          userId: session.user.id,
          userEmail: session.user.email,
        },
      });

      return res.status(201).json({ data: event });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[api/admin/ops/events] Error:', error);

    if (error.statusCode === 403) {
      return res.status(403).json({
        errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
      });
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
