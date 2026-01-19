import path from 'node:path';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import { requireDriver } from '@/lib/server/require-driver';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
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
  if (mime === 'application/pdf') return 'pdf';
  return null;
}

function safeBaseName(name) {
  const raw = String(name || '').trim() || 'upload';
  // keep letters/numbers/._- only
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60);
  return cleaned || 'upload';
}

export default async function handler(req, res) {
  const auth = await requireDriver(req, res);
  if (!auth) return;

  const { endUser } = auth;
  const endUserId = String(endUser.id);
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'driver', endUserId);

  if (req.method === 'GET') {
    try {
      await mkdir(uploadsDir, { recursive: true });
      const files = await readdir(uploadsDir).catch(() => []);
      const rows = await Promise.all(
        files.map(async (f) => {
          const fp = path.join(uploadsDir, f);
          const st = await stat(fp).catch(() => null);
          if (!st || !st.isFile()) return null;
          return {
            name: f,
            url: `/uploads/driver/${endUserId}/${f}`,
            size: st.size,
            updatedAt: st.mtime.toISOString(),
          };
        })
      );
      const out = rows.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return res.status(200).json({ data: { files: out } });
    } catch (e) {
      return res.status(500).json({ errors: { error: { msg: e?.message || 'Internal server error' } } });
    }
  }

  if (req.method === 'POST') {
    try {
      const { dataUrl, fileName } = req.body || {};
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        return res.status(400).json({ errors: { file: { msg: 'Invalid dataUrl' } } });
      }
      const ext = extForMime(parsed.mime);
      if (!ext) {
        return res.status(400).json({ errors: { file: { msg: `Unsupported file mime: ${parsed.mime}` } } });
      }

      // Hard limit: 8MB payload after decode
      const maxBytes = 8 * 1024 * 1024;
      if (parsed.buffer.length > maxBytes) {
        return res.status(413).json({ errors: { file: { msg: 'File too large (max 8MB)' } } });
      }

      await mkdir(uploadsDir, { recursive: true });
      const base = safeBaseName(fileName);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rand = crypto.randomBytes(4).toString('hex');
      const file = `${stamp}-${rand}-${base}.${ext}`;
      const fp = path.join(uploadsDir, file);
      await writeFile(fp, parsed.buffer);

      return res.status(201).json({
        data: {
          file: {
            name: file,
            url: `/uploads/driver/${endUserId}/${file}`,
            size: parsed.buffer.length,
            mime: parsed.mime,
          },
        },
      });
    } catch (e) {
      return res.status(500).json({ errors: { error: { msg: e?.message || 'Internal server error' } } });
    }
  }

  return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
}

