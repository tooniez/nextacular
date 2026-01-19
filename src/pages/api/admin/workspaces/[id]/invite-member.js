import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { inviteUsers } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      return;
    }

    const { id } = req.query;
    const { email, teamRole = 'MEMBER' } = req.body;

    if (!email) {
      return res.status(400).json({
        errors: { email: { msg: 'Email is required' } },
      });
    }

    // Get workspace to get slug
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { slug: true },
    });

    if (!workspace) {
      return res.status(404).json({
        errors: { workspace: { msg: 'Workspace not found' } },
      });
    }

    // Invite user
    const members = await inviteUsers(
      session.user.id,
      session.user.email,
      [{ email, teamRole }],
      workspace.slug
    );

    return res.status(200).json({ data: { members } });
  } catch (error) {
    console.error('[api/admin/workspaces/[id]/invite-member] Error:', error);
    if (res.headersSent) {
      return;
    }
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
