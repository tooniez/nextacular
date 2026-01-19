/**
 * Super Admin Stop Session API
 * POST: force-close a charging session (simulation / admin intervention)
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const session = await prisma.chargingSession.findUnique({
      where: { id },
      select: { id: true, status: true, startTime: true, endTime: true },
    });
    if (!session) {
      return res.status(404).json({ errors: { session: { msg: 'Session not found' } } });
    }

    // If already closed, be idempotent
    if (session.endTime) {
      return res.status(200).json({ data: session });
    }

    const now = new Date();
    const durationSeconds = Math.max(0, Math.floor((now - new Date(session.startTime)) / 1000));

    const updated = await prisma.chargingSession.update({
      where: { id: session.id },
      data: {
        endTime: now,
        durationSeconds,
        status: 'COMPLETED',
        stopReason: 'REMOTE',
      },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('POST /api/admin/sessions/[id]/stop error:', error);
    const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
    if (!res.headersSent) {
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }
};

export default handler;

