import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getSession } from '@/prisma/services/session';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;

      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Session ID required' } },
        });
      }

      // Verify workspace membership (VIEW permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      // Get session
      const sessionData = await getSession(id, workspaceId);

      if (!sessionData) {
        return res.status(404).json({
          errors: { session: { msg: 'Session not found' } },
        });
      }

      // Parse billing breakdown if present
      let billingBreakdown = null;
      if (sessionData.billingBreakdownJson) {
        try {
          billingBreakdown = JSON.parse(sessionData.billingBreakdownJson);
        } catch (e) {
          console.warn('[api/sessions/[id]] Failed to parse billingBreakdownJson:', e);
        }
      }

      res.status(200).json({
        data: {
          ...sessionData,
          billingBreakdown,
        },
      });
    } catch (error) {
      console.error('[api/sessions/[id]] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          errors: { error: { msg: error.message || 'Failed to fetch session' } },
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
