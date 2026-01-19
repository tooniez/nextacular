import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getRevenueDashboard } from '@/prisma/services/revenue';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'src/pages/api/dashboard/revenue.js',
          message: 'Revenue handler entry',
          data: {
            method,
            workspaceSlug: req.query?.workspaceSlug ? String(req.query.workspaceSlug) : null,
            from: req.query?.from || req.query?.fromDate || null,
            to: req.query?.to || req.query?.toDate || null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (VIEW permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'src/pages/api/dashboard/revenue.js',
          message: 'Workspace verified for revenue dashboard',
          data: { workspaceSlug: String(workspaceSlug), workspaceId: String(workspaceId) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      // Get date range from query params
      const fromParam = req.query.from || req.query.fromDate;
      const toParam = req.query.to || req.query.toDate;

      // Default to last 30 days if not provided
      const toDate = toParam ? new Date(toParam) : new Date();
      const fromDate = fromParam 
        ? new Date(fromParam) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({
          errors: { date: { msg: 'Invalid date format. Use YYYY-MM-DD' } },
        });
      }

      if (fromDate > toDate) {
        return res.status(400).json({
          errors: { date: { msg: 'From date must be before to date' } },
        });
      }

      // Limit date range to max 1 year
      const maxRange = 365 * 24 * 60 * 60 * 1000;
      if (toDate.getTime() - fromDate.getTime() > maxRange) {
        return res.status(400).json({
          errors: { date: { msg: 'Date range cannot exceed 1 year' } },
        });
      }

      // Get dashboard data
      const dashboardData = await getRevenueDashboard(workspaceId, fromDate, toDate);

      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H4',
          location: 'src/pages/api/dashboard/revenue.js',
          message: 'Revenue dashboard computed',
          data: {
            workspaceId: String(workspaceId),
            totalsPresent: !!dashboardData?.totals,
            timeSeriesCount: Array.isArray(dashboardData?.timeSeries) ? dashboardData.timeSeries.length : null,
            topStationsCount: Array.isArray(dashboardData?.topStations) ? dashboardData.topStations.length : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      res.status(200).json({ data: dashboardData });
    } catch (error) {
      console.error('GET /api/dashboard/revenue error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not a member') || error.message.includes('not found')) {
        return res.status(403).json({
          errors: { workspace: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: 'Internal server error' } },
      });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
