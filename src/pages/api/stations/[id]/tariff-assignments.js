import { validateSession, validateTariffAssignment } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import {
  getStationTariffAssignments,
  assignTariffToStation,
  assignTariffToConnector,
  deleteTariffAssignment,
} from '@/prisma/services/tariff-assignment';

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

      const assignments = await getStationTariffAssignments(workspaceId, stationId);

      res.status(200).json({ data: assignments });
    } catch (error) {
      console.error('GET /api/stations/[id]/tariff-assignments error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not a member')) {
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
      await validateTariffAssignment(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (FINANCE, ADMIN, OWNER for assign)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, ['FINANCE', 'ADMIN', 'OWNER']);

      const { tariffId, connectorId, validFrom, validUntil } = req.body;

      let assignment;
      if (connectorId) {
        // Assign to connector (override)
        assignment = await assignTariffToConnector(workspaceId, connectorId, tariffId, {
          validFrom,
          validUntil,
        });
      } else {
        // Assign to station (default)
        assignment = await assignTariffToStation(workspaceId, stationId, tariffId, {
          validFrom,
          validUntil,
        });
      }

      res.status(201).json({ data: assignment });
    } catch (error) {
      console.error('POST /api/stations/[id]/tariff-assignments error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          errors: { resource: { msg: error.message } },
        });
      }
      if (error.message.includes('must be after')) {
        return res.status(400).json({
          errors: { dates: { msg: error.message } },
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
      const assignmentId = req.query.assignmentId || req.body.assignmentId;
      
      if (!workspaceSlug || !assignmentId) {
        return res.status(400).json({
          errors: { params: { msg: 'Workspace slug and assignment ID required' } },
        });
      }

      // Verify workspace membership (FINANCE, ADMIN, OWNER for delete)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, ['FINANCE', 'ADMIN', 'OWNER']);

      await deleteTariffAssignment(workspaceId, assignmentId);

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/stations/[id]/tariff-assignments error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          errors: { assignment: { msg: error.message } },
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
