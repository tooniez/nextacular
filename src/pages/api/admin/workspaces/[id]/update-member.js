import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { TeamRole, InvitationStatus } from '@prisma/client';

const handler = async (req, res) => {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      return;
    }

    const { id: workspaceId } = req.query;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        errors: { memberId: { msg: 'Member ID is required' } },
      });
    }

    // Verify member belongs to this workspace
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!member) {
      return res.status(404).json({
        errors: { member: { msg: 'Member not found' } },
      });
    }

    if (req.method === 'DELETE') {
      // Soft delete member
      await prisma.member.update({
        where: { id: memberId },
        data: { deletedAt: new Date() },
      });

      return res.status(200).json({ data: { deleted: true } });
    }

    // PATCH: Update role or status
    const { teamRole, status } = req.body;
    const updateData = {};

    if (teamRole && Object.values(TeamRole).includes(teamRole)) {
      updateData.teamRole = teamRole;
    }

    if (status && Object.values(InvitationStatus).includes(status)) {
      updateData.status = status;
      if (status === InvitationStatus.ACCEPTED && !member.joinedAt) {
        updateData.joinedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        errors: { update: { msg: 'No valid fields to update' } },
      });
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('[api/admin/workspaces/[id]/update-member] Error:', error);
    if (res.headersSent) {
      return;
    }
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
