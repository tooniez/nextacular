import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { generatePayoutStatement } from '@/prisma/services/payout';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;

      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.FINANCE);

      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({
          errors: { period: { msg: 'periodStart and periodEnd are required' } },
        });
      }

      const preview = await generatePayoutStatement({
        workspaceId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        createdByUserId: session.user.userId,
        mode: 'dry_run',
      });

      res.status(200).json({ data: preview });
    } catch (error) {
      console.error('[api/payouts/preview] Error:', error);
      if (!res.headersSent) {
        const msg = String(error?.message || 'Failed to generate preview');
        if (msg === 'Unauthorized access') {
          return res.status(401).json({ errors: { session: { msg } } });
        }
        if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
          return res.status(403).json({ errors: { workspace: { msg } } });
        }
        return res.status(500).json({ errors: { error: { msg } } });
      }
    }
  } else {
    res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }
};

export default handler;
