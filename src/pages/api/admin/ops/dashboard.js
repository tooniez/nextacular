/**
 * Operations Dashboard API
 * GET: Get operations KPI (real-time / near real-time)
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { getOperationsDashboardKPI } from '@/prisma/services/ops-monitoring';

const handler = async (req, res) => {
  try {
    // #region agent log - debug API call
    console.log('[DEBUG] /api/admin/ops/dashboard called', {
      method: req.method,
      timestamp: Date.now(),
    });
    // #endregion

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // RBAC: Only Super Admin
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      // verifySuperAdmin already sent response
      return;
    }

    // #region agent log - debug after auth
    console.log('[DEBUG] Super Admin verified, getting KPI', {
      workspaceId: req.query.workspaceId,
      timestamp: Date.now(),
    });
    // #endregion

    const { workspaceId } = req.query;

    // #region agent log - debug before KPI call
    console.log('[DEBUG] Calling getOperationsDashboardKPI', {
      workspaceId: workspaceId || null,
      timestamp: Date.now(),
    });
    // #endregion

    const kpi = await getOperationsDashboardKPI(workspaceId || null);

    // #region agent log - debug after KPI call
    console.log('[DEBUG] KPI retrieved successfully', {
      hasStations: !!kpi?.stations,
      hasConnectors: !!kpi?.connectors,
      timestamp: Date.now(),
    });
    // #endregion

    return res.status(200).json({ data: kpi });
  } catch (error) {
    // #region agent log - debug error
    console.error('[DEBUG] /api/admin/ops/dashboard Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
    // #endregion
    console.error('[api/admin/ops/dashboard] Error:', error);

    // Check if response already sent
    if (res.headersSent) {
      return;
    }

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
