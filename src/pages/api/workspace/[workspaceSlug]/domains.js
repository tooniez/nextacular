import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getDomainsByWorkspaceId } from '@/prisma/services/domain';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = String(req.query.workspaceSlug || '').trim();
      // Tenant boundary + role: domains are sensitive -> ADMIN/OWNER (or SUPER_ADMIN)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.ADMIN);
      const domains = await getDomainsByWorkspaceId(workspaceId);
      return res.status(200).json({ data: { domains } });
    } catch (error) {
      if (res.headersSent) return;
      const msg = String(error?.message || 'Internal server error');
      if (msg === 'Unauthorized access') {
        return res.status(401).json({ errors: { session: { msg } } });
      }
      if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
        return res.status(403).json({ errors: { workspace: { msg } } });
      }
      return res.status(500).json({ errors: { error: { msg } } });
    }
  } else {
    res.status(405).json({ error: `${method} method unsupported` });
  }
};

export default handler;
