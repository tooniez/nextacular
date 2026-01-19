import { validateSession, validateUpdateConnector } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getConnector, updateConnector, deleteConnector } from '@/prisma/services/connector';

const handler = async (req, res) => {
  const { method } = req;
  const { connectorId } = req.query;

  if (method === 'PATCH') {
    try {
      const session = await validateSession(req, res);
      await validateUpdateConnector(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (EDIT permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

      const { name, status, maxPower, connectorType } = req.body;

      const connector = await updateConnector(workspaceId, connectorId, {
        name,
        status,
        maxPower: maxPower !== undefined ? parseFloat(maxPower) : undefined,
        connectorType,
      });

      res.status(200).json({ data: connector });
    } catch (error) {
      console.error('PATCH /api/connectors/[connectorId] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message === 'Connector not found' || error.message.includes('not found')) {
        return res.status(404).json({
          errors: { connector: { msg: error.message } },
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

      // Verify workspace membership (EDIT permission for connector delete)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

      await deleteConnector(workspaceId, connectorId);
      res.status(200).json({ data: { id: connectorId } });
    } catch (error) {
      console.error('DELETE /api/connectors/[connectorId] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message === 'Connector not found' || error.message.includes('not found')) {
        return res.status(404).json({
          errors: { connector: { msg: error.message } },
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
