import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifySuperAdmin(req, res);

    const { id } = req.query;

    const members = await prisma.member.findMany({
      where: {
        workspaceId: id,
        deletedAt: null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return res.status(200).json({
      data: members,
    });
  } catch (error) {
    console.error('[api/admin/workspaces/[id]/members] Error:', error);
    if (error.statusCode === 403) {
      return res.status(403).json({
        errors: { auth: { msg: 'Unauthorized: Organizations permission required' } },
      });
    }
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
