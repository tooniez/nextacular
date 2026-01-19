import { validateSession, validateCreateStation } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getStations, createStation } from '@/prisma/services/station';

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

      // Verify workspace membership (VIEW permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      // Get query params
      const search = req.query.search || '';
      const status = req.query.status || null;
      const city = req.query.city || '';
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      // Get stations
      const result = await getStations(workspaceId, {
        search,
        status,
        city,
        page,
        pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('GET /api/stations error:', error);
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
      await validateCreateStation(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (EDIT permission for create)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

      const { ocppId, name, location, latitude, longitude, ocppVersion } = req.body;

      const station = await createStation(workspaceId, {
        ocppId,
        name,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        ocppVersion,
      });

      res.status(201).json({ data: station });
    } catch (error) {
      console.error('POST /api/stations error:', error);
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
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          errors: { ocppId: { msg: error.message } },
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
