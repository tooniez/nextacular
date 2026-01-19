/**
 * Workspace Logo API (Sub-CPO branding)
 * PUT: upload/replace logo via data URL (base64), or remove if null.
 */
import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import prisma from '@/prisma/index';
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const buffer = Buffer.from(b64, 'base64');
  return { mime, buffer };
}

function extForMime(mime) {
  // Keep this strict: no SVG to avoid script injection.
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return null;
}

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'PUT') {
    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }

  try {
    const session = await validateSession(req, res);
    const workspaceSlug = String(req.query.workspaceSlug || '').trim();
    const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.EDIT);

    const { logoDataUrl } = req.body || {};

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'workspaces', workspaceId);
    await mkdir(uploadsDir, { recursive: true });

    let nextLogoUrl = null;

    if (logoDataUrl === null) {
      // remove
      nextLogoUrl = null;
      // best-effort: delete common logo files
      await Promise.all(
        ['logo.png', 'logo.jpg', 'logo.webp'].map(async (f) => {
          try {
            await unlink(path.join(uploadsDir, f));
          } catch {}
        })
      );
    } else if (typeof logoDataUrl === 'string' && logoDataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(logoDataUrl);
      if (!parsed) {
        return res.status(400).json({ errors: { logo: { msg: 'Invalid logoDataUrl' } } });
      }
      const ext = extForMime(parsed.mime);
      if (!ext) {
        return res.status(400).json({ errors: { logo: { msg: `Unsupported logo mime: ${parsed.mime}` } } });
      }
      const file = `logo.${ext}`;
      const filePath = path.join(uploadsDir, file);
      await writeFile(filePath, parsed.buffer);
      nextLogoUrl = `/uploads/workspaces/${workspaceId}/${file}`;
    } else {
      return res.status(400).json({ errors: { logo: { msg: 'logoDataUrl must be a data URL or null' } } });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { brandLogoUrl: nextLogoUrl },
      select: {
        id: true,
        slug: true,
        name: true,
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
        location: 'src/pages/api/workspace/[workspaceSlug]/logo.js',
        message: 'workspace logo updated',
        data: { workspaceId: updated.id, hasLogo: !!updated.brandLogoUrl },
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
        location: 'src/pages/api/workspace/[workspaceSlug]/logo.js',
        message: 'workspace logo update error',
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

