import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getPayoutStatement } from '@/prisma/services/payout';

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
          errors: { id: { msg: 'Statement ID required' } },
        });
      }

      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      const statement = await getPayoutStatement(id, workspaceId);

      if (!statement) {
        return res.status(404).json({
          errors: { statement: { msg: 'Payout statement not found' } },
        });
      }

      res.status(200).json({ data: statement });
    } catch (error) {
      console.error('[api/payouts/[id]] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          errors: { error: { msg: error.message || 'Failed to fetch payout statement' } },
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
