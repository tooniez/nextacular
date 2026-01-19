import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getPayoutStatements, generatePayoutStatement } from '@/prisma/services/payout';

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

      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      const status = req.query.status || null;
      const from = req.query.from || null;
      const to = req.query.to || null;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const result = await getPayoutStatements(workspaceId, {
        status,
        from,
        to,
        page,
        pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('[api/payouts] Error:', error);
      if (!res.headersSent) {
        const msg = String(error?.message || 'Failed to fetch payout statements');
        if (msg === 'Unauthorized access') {
          return res.status(401).json({ errors: { session: { msg } } });
        }
        if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
          return res.status(403).json({ errors: { workspace: { msg } } });
        }
        return res.status(500).json({ errors: { error: { msg } } });
      }
    }
  } else if (method === 'POST') {
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

      const statement = await generatePayoutStatement({
        workspaceId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        createdByUserId: session.user.userId,
        mode: 'commit',
      });

      res.status(201).json({ data: statement });
    } catch (error) {
      console.error('[api/payouts] Error:', error);
      if (!res.headersSent) {
        const msg = String(error?.message || 'Failed to create payout statement');
        if (msg === 'Unauthorized access') {
          return res.status(401).json({ errors: { session: { msg } } });
        }
        if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
          return res.status(403).json({ errors: { workspace: { msg } } });
        }
        const status = msg.includes('already exists') ? 409 : 500;
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
