import { validateSession, validateUpdateTariff } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getTariffProfile, updateTariffProfile, deleteTariffProfile } from '@/prisma/services/tariff';

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

      // Verify workspace membership (VIEW permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      const tariff = await getTariffProfile(workspaceId, id);

      res.status(200).json({ data: tariff });
    } catch (error) {
      console.error('GET /api/tariffs/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          errors: { tariff: { msg: error.message } },
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
  } else if (method === 'PATCH') {
    try {
      const session = await validateSession(req, res);
      await validateUpdateTariff(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (FINANCE, ADMIN, OWNER for edit)
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

      const tariff = await updateTariffProfile(workspaceId, id, {
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

      res.status(200).json({ data: tariff });
    } catch (error) {
      console.error('PATCH /api/tariffs/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          errors: { tariff: { msg: error.message } },
        });
      }
      if (error.message.includes('must be between')) {
        return res.status(400).json({
          errors: { msFeePercent: { msg: error.message } },
        });
      }
      if (error.message.includes('not a member')) {
        return res.status(403).json({
          errors: { workspace: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'DELETE') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (FINANCE, ADMIN, OWNER for delete)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, ['FINANCE', 'ADMIN', 'OWNER']);

      await deleteTariffProfile(workspaceId, id);

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/tariffs/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          errors: { tariff: { msg: error.message } },
        });
      }
      if (error.message.includes('not a member')) {
        return res.status(403).json({
          errors: { workspace: { msg: error.message } },
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
