import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { cancelPayoutStatement } from '@/prisma/services/payout';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method === 'POST') {
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
          errors: { id: { msg: 'Statement ID required' } },
        });
      }

      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.FINANCE);

      const statement = await cancelPayoutStatement(id);

      // Verify workspace match
      if (statement.workspaceId !== workspaceId) {
        return res.status(403).json({
          errors: { statement: { msg: 'Access denied' } },
        });
      }

      res.status(200).json({ data: statement });
    } catch (error) {
      console.error('[api/payouts/[id]/cancel] Error:', error);
      if (!res.headersSent) {
        const msg = String(error?.message || 'Failed to cancel payout statement');
        if (msg === 'Unauthorized access') {
          return res.status(401).json({ errors: { session: { msg } } });
        }
        if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
          return res.status(403).json({ errors: { workspace: { msg } } });
        }
        const status = msg.includes('not found') ? 404 : msg.includes('status') ? 400 : 500;
        return res.status(status).json({ errors: { error: { msg } } });
      }
    }
  } else {
    res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }
};

export default handler;
