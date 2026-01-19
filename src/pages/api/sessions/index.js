import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getSessions } from '@/prisma/services/session';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;

      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (VIEW permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      // Get query params
      const status = req.query.status || null;
      const stationId = req.query.stationId || null;
      const from = req.query.from || null;
      const to = req.query.to || null;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      // Get sessions
      const result = await getSessions(workspaceId, {
        status,
        stationId,
        from,
        to,
        page,
        pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('[api/sessions] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          errors: { error: { msg: error.message || 'Failed to fetch sessions' } },
        });
      }
    }
  } else {
    res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }
};

export default handler;
