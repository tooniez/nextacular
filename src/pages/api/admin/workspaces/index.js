import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { getWorkspaces } from '@/prisma/services/workspace-admin';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifySuperAdmin(req, res);

    const {
      status = 'all',
      search = '',
      page = 1,
      pageSize = 20,
    } = req.query;

    const result = await getWorkspaces({
      status,
      search,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('[api/admin/workspaces] Error:', error);
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
