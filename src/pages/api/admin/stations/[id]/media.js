/**
 * Super Admin Station Media API
 * PUT: upload/replace logo and add/remove photos
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import crypto from 'node:crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
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
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return null;
}

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'PUT') {
    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const station = await prisma.chargingStation.findUnique({
      where: { id },
      select: { id: true, logoUrl: true, photoUrls: true },
    });
    if (!station) {
      return res.status(404).json({ errors: { station: { msg: 'Station not found' } } });
    }

    const { logoDataUrl, photosDataUrls, removePhotoUrls } = req.body || {};

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'stations', station.id);
    await mkdir(uploadsDir, { recursive: true });

    // Existing photos list
    const existingPhotoUrls = Array.isArray(station.photoUrls) ? station.photoUrls : [];
    let nextPhotoUrls = existingPhotoUrls.slice();

    // Remove photos by URL
    if (Array.isArray(removePhotoUrls) && removePhotoUrls.length > 0) {
      const toRemove = new Set(removePhotoUrls.filter((u) => typeof u === 'string'));
      nextPhotoUrls = nextPhotoUrls.filter((u) => !toRemove.has(u));

      // Best-effort: delete files that are under our uploads folder
      await Promise.all(
        removePhotoUrls
          .filter((u) => typeof u === 'string')
          .map(async (u) => {
            try {
              const filePath = path.join(process.cwd(), 'public', u);
              // Only allow deleting inside our station folder
              if (!filePath.startsWith(uploadsDir)) return;
              await unlink(filePath);
            } catch {
              // ignore
            }
          })
      );
    }

    // Handle logo: undefined => keep, null => remove, string => replace
    let nextLogoUrl = station.logoUrl || null;
    if (logoDataUrl === null) {
      nextLogoUrl = null;
    } else if (typeof logoDataUrl === 'string' && logoDataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(logoDataUrl);
      if (!parsed) {
        return res.status(400).json({ errors: { logo: { msg: 'Invalid logoDataUrl' } } });
      }
      const ext = extForMime(parsed.mime);
      if (!ext) {
        return res.status(400).json({ errors: { logo: { msg: `Unsupported logo mime: ${parsed.mime}` } } });
      }
      const logoFile = `logo.${ext}`;
      const logoPath = path.join(uploadsDir, logoFile);
      await writeFile(logoPath, parsed.buffer);
      nextLogoUrl = `/uploads/stations/${station.id}/${logoFile}`;
    }

    // Add photos (append)
    if (Array.isArray(photosDataUrls) && photosDataUrls.length > 0) {
      const saved = [];
      for (const dataUrl of photosDataUrls) {
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) continue;
        const ext = extForMime(parsed.mime);
        if (!ext) continue;
        const file = `photo-${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, file);
        await writeFile(filePath, parsed.buffer);
        saved.push(`/uploads/stations/${station.id}/${file}`);
      }
      nextPhotoUrls = [...nextPhotoUrls, ...saved];
    }

    const updated = await prisma.chargingStation.update({
      where: { id: station.id },
      data: {
        logoUrl: nextLogoUrl,
        photoUrls: nextPhotoUrls,
      },
      select: { id: true, logoUrl: true, photoUrls: true },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('PUT /api/admin/stations/[id]/media error:', error);
    if (!res.headersSent) {
      const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }
};

export default handler;

