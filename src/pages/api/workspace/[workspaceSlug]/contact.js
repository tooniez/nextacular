import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import prisma from '@/prisma/index';
import isEmail from 'validator/lib/isEmail';
import isURL from 'validator/lib/isURL';

const handler = async (req, res) => {
  const { method } = req;

  if (method !== 'PUT') {
    return res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/api/workspace/[workspaceSlug]/contact.js',
        message: 'contact update entry',
        data: { workspaceSlug: String(req.query.workspaceSlug || ''), hasBody: !!req.body },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const session = await validateSession(req, res);
    const workspaceSlug = String(req.query.workspaceSlug || '').trim();
    const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

    const rawWebsite = typeof req.body?.contactWebsiteUrl === 'string' ? req.body.contactWebsiteUrl.trim() : '';
    const rawEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.trim() : '';
    const rawPhone = typeof req.body?.contactPhone === 'string' ? req.body.contactPhone.trim() : '';
    const rawLogo = typeof req.body?.brandLogoUrl === 'string' ? req.body.brandLogoUrl.trim() : '';

    const errors = {};

    let website = rawWebsite || null;
    if (website) {
      // Allow entering "example.com" and normalize to https://example.com
      const hasProto = /^https?:\/\//i.test(website);
      const candidate = hasProto ? website : `https://${website}`;
      const ok = isURL(candidate, { require_protocol: true, allow_underscores: true });
      if (!ok) errors.contactWebsiteUrl = { msg: 'Invalid website URL' };
      website = ok ? candidate : null;
    }

    let email = rawEmail || null;
    if (email) {
      const normalized = email.toLowerCase();
      if (!isEmail(normalized)) errors.contactEmail = { msg: 'Invalid email address' };
      email = isEmail(normalized) ? normalized : null;
    }

    let phone = rawPhone || null;
    if (phone && phone.length > 40) errors.contactPhone = { msg: 'Phone number too long' };
    if (phone && phone.length > 0 && phone.length < 5) errors.contactPhone = { msg: 'Phone number too short' };
    phone = phone && !errors.contactPhone ? phone : null;

    let brandLogoUrl = rawLogo || null;
    if (brandLogoUrl) {
      const hasProto = /^https?:\/\//i.test(brandLogoUrl);
      const candidate = hasProto ? brandLogoUrl : `https://${brandLogoUrl}`;
      const ok = isURL(candidate, { require_protocol: true, allow_underscores: true });
      if (!ok) errors.brandLogoUrl = { msg: 'Invalid logo URL' };
      brandLogoUrl = ok ? candidate : null;
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ errors });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        contactWebsiteUrl: website,
        contactEmail: email,
        contactPhone: phone,
        brandLogoUrl,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        workspaceCode: true,
        inviteCode: true,
        isActive: true,
        isSuspended: true,
        contactWebsiteUrl: true,
        contactEmail: true,
        contactPhone: true,
        brandLogoUrl: true,
      },
    });

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/api/workspace/[workspaceSlug]/contact.js',
        message: 'contact update success',
        data: { workspaceId: updated.id, hasWebsite: !!updated.contactWebsiteUrl, hasEmail: !!updated.contactEmail, hasPhone: !!updated.contactPhone },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return res.status(200).json({ data: { workspace: updated } });
  } catch (error) {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/api/workspace/[workspaceSlug]/contact.js',
        message: 'contact update error',
        data: { err: String(error?.message || 'error') },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (error.message === 'Unauthorized access') {
      return res.status(401).json({ errors: { session: { msg: error.message } } });
    }
    if (error.message.includes('not a member') || error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ errors: { workspace: { msg: error.message } } });
    }
    return res.status(500).json({ errors: { error: { msg: error.message || 'Internal server error' } } });
  }
};

export default handler;

