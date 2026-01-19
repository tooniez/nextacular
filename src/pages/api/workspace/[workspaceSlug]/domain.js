import { validateAddDomain, validateSession } from '@/config/api-validation';
import api from '@/lib/common/api';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import {
  createDomain,
  deleteDomain,
  verifyDomain,
} from '@/prisma/services/domain';

const handler = async (req, res) => {
  const { method } = req;
  const workspaceSlug = String(req.query.workspaceSlug || '').trim();

  if (method === 'POST') {
    try {
      const session = await validateSession(req, res);
      await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.ADMIN);
      await validateAddDomain(req, res);
      const { domainName } = req.body;
      const teamId = process.env.VERCEL_TEAM_ID;
      const response = await api(
        `${process.env.VERCEL_API_URL}/v9/projects/${
          process.env.VERCEL_PROJECT_ID
        }/domains${teamId ? `?teamId=${teamId}` : ''}`,
        {
          body: { name: domainName },
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_AUTH_BEARER_TOKEN}`,
          },
          method: 'POST',
        }
      );

      if (!response.error) {
        const { apexName, verified, verification } = response;
        await createDomain(
          session.user.userId,
          session.user.email,
          workspaceSlug,
          domainName,
          apexName,
          verified,
          verification
        );
        return res.status(200).json({ data: { domain: domainName } });
      }
      return res
        .status(response.status)
        .json({ errors: { error: { msg: response.error.message } } });
    } catch (error) {
      if (res.headersSent) return;
      const msg = String(error?.message || 'Internal server error');
      if (msg === 'Unauthorized access') {
        return res.status(401).json({ errors: { session: { msg } } });
      }
      if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
        return res.status(403).json({ errors: { workspace: { msg } } });
      }
      return res.status(500).json({ errors: { error: { msg } } });
    }
  } else if (method === 'PUT') {
    try {
      const session = await validateSession(req, res);
      await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.ADMIN);
      const { domainName } = req.body;
      const teamId = process.env.VERCEL_TEAM_ID;
      const response = await api(
        `${process.env.VERCEL_API_URL}/v9/projects/${
          process.env.VERCEL_PROJECT_ID
        }/domains/${domainName}/verify${teamId ? `?teamId=${teamId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_AUTH_BEARER_TOKEN}`,
          },
          method: 'POST',
        }
      );

      if (!response.error) {
        await verifyDomain(
          session.user.userId,
          session.user.email,
          workspaceSlug,
          domainName,
          response.verified
        );
        return res.status(200).json({ data: { verified: response.verified } });
      }
      return res
        .status(response.status)
        .json({ errors: { error: { msg: response.error.message } } });
    } catch (error) {
      if (res.headersSent) return;
      const msg = String(error?.message || 'Internal server error');
      if (msg === 'Unauthorized access') {
        return res.status(401).json({ errors: { session: { msg } } });
      }
      if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
        return res.status(403).json({ errors: { workspace: { msg } } });
      }
      return res.status(500).json({ errors: { error: { msg } } });
    }
  } else if (method === 'DELETE') {
    try {
      const session = await validateSession(req, res);
      await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.ADMIN);
      const { domainName } = req.body;
      const teamId = process.env.VERCEL_TEAM_ID;
      await api(
        `${process.env.VERCEL_API_URL}/v8/projects/${
          process.env.VERCEL_PROJECT_ID
        }/domains/${domainName}${teamId ? `?teamId=${teamId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_AUTH_BEARER_TOKEN}`,
          },
          method: 'DELETE',
        }
      );
      await deleteDomain(
        session.user.userId,
        session.user.email,
        workspaceSlug,
        domainName
      );
      return res.status(200).json({ data: { domain: domainName } });
    } catch (error) {
      if (res.headersSent) return;
      const msg = String(error?.message || 'Internal server error');
      if (msg === 'Unauthorized access') {
        return res.status(401).json({ errors: { session: { msg } } });
      }
      if (msg.includes('not a member') || msg.includes('Insufficient permissions') || msg.includes('Workspace not found')) {
        return res.status(403).json({ errors: { workspace: { msg } } });
      }
      return res.status(500).json({ errors: { error: { msg } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
