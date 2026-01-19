/**
 * Platform Settings History API
 * GET: Get audit history of platform settings changes
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { getPlatformSettingsHistory } from '@/prisma/services/platform-settings';

const handler = async (req, res) => {
  try {
    // RBAC: Only Super Admin
    await verifySuperAdmin(req, res);

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      page = 1,
      pageSize = 20,
    } = req.query;

    const result = await getPlatformSettingsHistory({
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('[api/admin/platform/settings/history] Error:', error);

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
