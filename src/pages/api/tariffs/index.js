import { validateSession, validateCreateTariff } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getTariffProfiles, createTariffProfile } from '@/prisma/services/tariff';

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

      // Verify workspace membership (VIEW permission - all roles can view)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      // Get query params
      const search = req.query.search || '';
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      // Get tariffs
      const result = await getTariffProfiles(workspaceId, {
        search,
        isActive,
        page,
        pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('GET /api/tariffs error:', error);
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
  } else if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      await validateCreateTariff(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (FINANCE, ADMIN, OWNER for create)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, ['FINANCE', 'ADMIN', 'OWNER']);

      const {
        name,
        basePricePerKwh,
        pricePerMinute,
        sessionStartFee,
        currency,
        msFeePercent,
        isActive,
        validFrom,
        validUntil,
      } = req.body;

      const tariff = await createTariffProfile(workspaceId, {
        name,
        basePricePerKwh,
        pricePerMinute,
        sessionStartFee,
        currency,
        msFeePercent,
        isActive,
        validFrom,
        validUntil,
      });

      res.status(201).json({ data: tariff });
    } catch (error) {
      console.error('POST /api/tariffs error:', error);
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
      if (error.message.includes('must be between')) {
        return res.status(400).json({
          errors: { msFeePercent: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
