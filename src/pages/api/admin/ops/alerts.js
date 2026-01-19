/**
 * Operations Alerts API
 * GET: Get alerts with filters
 * PATCH: Acknowledge or resolve alert
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats,
} from '@/prisma/services/alerts';

const handler = async (req, res) => {
  try {
    // RBAC: Only Super Admin
    const session = await verifySuperAdmin(req, res);

    if (req.method === 'GET') {
      const { stats } = req.query;

      if (stats === 'true') {
        // Return alert statistics
        const alertStats = await getAlertStats();
        return res.status(200).json({ data: alertStats });
      }

      // Return alerts with filters
      const {
        status,
        severity,
        resourceType,
        workspaceId,
        page = 1,
        pageSize = 20,
      } = req.query;

      const result = await getAlerts({
        status: status || null,
        severity: severity || null,
        resourceType: resourceType || null,
        workspaceId: workspaceId || null,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });

      return res.status(200).json({ data: result });
    }

    if (req.method === 'PATCH') {
      const { alertId, action } = req.body;

      if (!alertId || !action) {
        return res.status(400).json({
          errors: { validation: { msg: 'alertId and action are required' } },
        });
      }

      if (!['ack', 'resolve'].includes(action)) {
        return res.status(400).json({
          errors: { validation: { msg: 'action must be "ack" or "resolve"' } },
        });
      }

      const updated =
        action === 'ack'
          ? await acknowledgeAlert(alertId, session.user.id, session.user.email)
          : await resolveAlert(alertId, session.user.id, session.user.email);

      return res.status(200).json({ data: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[api/admin/ops/alerts] Error:', error);

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
