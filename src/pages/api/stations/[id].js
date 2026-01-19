import { validateSession, validateUpdateStation } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getStation, updateStation, deleteStation } from '@/prisma/services/station';

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

      const station = await getStation(workspaceId, id);

      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'src/pages/api/stations/[id].js',
          message: 'Station fetched (contact fields present?)',
          data: {
            stationId: String(id),
            hasWorkspace: !!station?.workspace,
            hasWebsite: !!station?.workspace?.contactWebsiteUrl,
            hasEmail: !!station?.workspace?.contactEmail,
            hasPhone: !!station?.workspace?.contactPhone,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      res.status(200).json({ data: station });
    } catch (error) {
      console.error('GET /api/stations/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message === 'Station not found' || error.message.includes('not found')) {
        return res.status(404).json({
          errors: { station: { msg: error.message } },
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
  } else if (method === 'PATCH') {
    try {
      const session = await validateSession(req, res);
      await validateUpdateStation(req, res);
      
      const workspaceSlug = req.query.workspaceSlug || req.body.workspaceSlug || req.body.workspaceId;
      
      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      // Verify workspace membership (EDIT permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

      const { name, location, latitude, longitude, status, ocppVersion } = req.body;

      const station = await updateStation(workspaceId, id, {
        name,
        location,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        status,
        ocppVersion,
      });

      res.status(200).json({ data: station });
    } catch (error) {
      console.error('PATCH /api/stations/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message === 'Station not found' || error.message.includes('not found')) {
        return res.status(404).json({
          errors: { station: { msg: error.message } },
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

      // Verify workspace membership (DELETE permission)
      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.DELETE);

      await deleteStation(workspaceId, id);
      res.status(200).json({ data: { id } });
    } catch (error) {
      console.error('DELETE /api/stations/[id] error:', error);
      if (error.message === 'Unauthorized access') {
        return res.status(401).json({
          errors: { session: { msg: error.message } },
        });
      }
      if (error.message === 'Station not found' || error.message.includes('not found')) {
        return res.status(404).json({
          errors: { station: { msg: error.message } },
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
