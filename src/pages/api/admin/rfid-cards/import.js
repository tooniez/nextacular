/**
 * Super Admin RFID import
 * POST: import RFID cards from CSV
 *
 * CSV columns (header optional):
 *   serial,email,name,balanceEur
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // naive CSV (comma-separated, no quoted commas)
  const rows = lines.map((l) => l.split(',').map((c) => c.trim()));
  const header = rows[0].map((c) => c.toLowerCase());
  const hasHeader =
    header.includes('serial') ||
    header.includes('rfid') ||
    header.includes('email') ||
    header.includes('name') ||
    header.includes('balanceeur');

  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.map((cols) => {
    const [serial, email, name, balanceEur] = cols;
    return {
      serial: serial || '',
      email: email || '',
      name: name || '',
      balanceEur: balanceEur || '',
    };
  });
}

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const { csv } = req.body || {};
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return res.status(400).json({ errors: { csv: { msg: 'CSV is empty' } } });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const serial = String(r.serial || '').trim();
      if (!serial) {
        skipped++;
        continue;
      }

      const email = String(r.email || '').trim() || null;
      const name = String(r.name || '').trim() || null;
      const balanceEur = r.balanceEur ? Number(r.balanceEur) : 0;
      const balanceCents = Number.isFinite(balanceEur) ? Math.max(0, Math.round(balanceEur * 100)) : 0;

      try {
        const existing = await prisma.endUser.findUnique({ where: { rfidToken: serial } });
        if (!existing) {
          await prisma.endUser.create({
            data: {
              email,
              name,
              rfidToken: serial,
              status: 'ACTIVE',
              rfidBalanceCents: balanceCents,
            },
          });
          created++;
        } else {
          await prisma.endUser.update({
            where: { id: existing.id },
            data: {
              email: email || existing.email,
              name: name || existing.name,
              // If CSV provides a balance, set it (ops import)
              rfidBalanceCents: balanceCents ? balanceCents : existing.rfidBalanceCents,
              status: existing.status === 'DELETED' ? 'ACTIVE' : existing.status,
              deletedAt: null,
            },
          });
          updated++;
        }
      } catch (e) {
        errors.push({ row: i + 1, serial, error: e?.message || String(e) });
      }
    }

    return res.status(200).json({
      data: { totalRows: rows.length, created, updated, skipped, errors },
    });
  } catch (error) {
    console.error('POST /api/admin/rfid-cards/import error:', error);
    const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
    if (!res.headersSent) {
      return res.status(status).json({ errors: { error: { msg: error.message || 'Internal server error' } } });
    }
  }
};

export default handler;

