import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { getWorkspaceById, updateWorkspaceSettings } from '@/prisma/services/workspace-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    try {
      await verifySuperAdmin(req, res);

      const workspace = await getWorkspaceById(id);
      
      // Get first station for address info
      const firstStation = await prisma.chargingStation.findFirst({
        where: {
          workspaceId: id,
          deletedAt: null,
        },
        select: {
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Add station location to workspace data
      if (workspace) {
        workspace.stationLocation = firstStation?.location || null;
      }

      if (!workspace) {
        return res.status(404).json({
          errors: { workspace: { msg: 'Workspace not found' } },
        });
      }

      return res.status(200).json({ data: workspace });
    } catch (error) {
      console.error('[api/admin/workspaces/[id]] Error:', error);
      if (error.statusCode === 403) {
        return res.status(403).json({
          errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
        });
      }
      return res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }

  if (method === 'PATCH') {
    try {
      const session = await verifySuperAdmin(req, res);

      const updates = req.body;
      const { reason } = updates;

      // Remove reason from updates (it's for history only)
      delete updates.reason;

      const result = await updateWorkspaceSettings(
        id,
        updates,
        session.user.id,
        reason
      );

      return res.status(200).json({ data: result });
    } catch (error) {
      console.error('[api/admin/workspaces/[id]] Error:', error);
      if (error.statusCode === 403) {
        return res.status(403).json({
          errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
        });
      }
      if (error.message.includes('must be')) {
        return res.status(400).json({
          errors: { validation: { msg: error.message } },
        });
      }
      return res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }

  if (method === 'DELETE') {
    try {
      await verifySuperAdmin(req, res);

      const workspace = await prisma.workspace.findUnique({ where: { id } });
      if (!workspace) {
        return res.status(404).json({
          errors: { workspace: { msg: 'Workspace not found' } },
        });
      }

      const now = new Date();
      await prisma.$transaction([
        prisma.chargingStation.updateMany({
          where: { workspaceId: id, deletedAt: null },
          data: { deletedAt: now },
        }),
        prisma.workspace.update({
          where: { id },
          data: {
            deletedAt: now,
            isActive: false,
            isSuspended: true,
            suspendedAt: now,
            suspensionReason: 'Deleted by admin',
          },
        }),
      ]);

      return res.status(200).json({ data: { id, deletedAt: now.toISOString() } });
    } catch (error) {
      console.error('[api/admin/workspaces/[id]] DELETE Error:', error);
      if (error.statusCode === 403) {
        return res.status(403).json({
          errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
        });
      }
      return res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;
