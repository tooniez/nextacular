import { validateSession, validateCreateConnector } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getConnectors, createConnector } from '@/prisma/services/connector';

const handler = async (req, res) => {
  const { method } = req;
  const { id: stationId } = req.query;

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

      const connectors = await getConnectors(workspaceId, stationId);
      res.status(200).json({ data: connectors });
    } catch (error) {
      console.error('GET /api/stations/[id]/connectors error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found') || error.message.includes('not a member')) {
        return res.status(error.message.includes('not a member') ? 403 : 404).json({
          errors: { error: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: 'Internal server error' } },
      });
    }
  } else if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      await validateCreateConnector(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (EDIT permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

      const { connectorId, name, maxPower, connectorType } = req.body;

      const connector = await createConnector(workspaceId, stationId, {
        connectorId: parseInt(connectorId),
        name,
        maxPower: maxPower ? parseFloat(maxPower) : null,
        connectorType,
      });

      res.status(201).json({ data: connector });
    } catch (error) {
      console.error('POST /api/stations/[id]/connectors error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          errors: { connectorId: { msg: error.message } },
        });
      }
      if (error.message.includes('not found') || error.message.includes('not a member')) {
        return res.status(error.message.includes('not a member') ? 403 : 404).json({
          errors: { error: { msg: error.message } },
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
