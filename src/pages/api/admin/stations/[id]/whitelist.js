/**
 * Super Admin Station RFID Whitelist API
 * GET: list whitelist cards for station
 * POST: add a card
 * DELETE: remove one or many cards
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import crypto from 'node:crypto';

function normalizeUid(uid) {
  if (typeof uid !== 'string') return '';
  return uid.trim();
}

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const station = await prisma.chargingStation.findUnique({
      where: { id },
      select: { id: true, rfidWhitelist: true },
    });
    if (!station) {
      return res.status(404).json({ errors: { station: { msg: 'Station not found' } } });
    }

    const current = Array.isArray(station.rfidWhitelist) ? station.rfidWhitelist : [];

    if (method === 'GET') {
      return res.status(200).json({ data: current });
    }

    if (method === 'POST') {
      const { uid, name, type } = req.body || {};
      const normalized = normalizeUid(uid);
      if (!normalized) {
        return res.status(400).json({ errors: { uid: { msg: 'uid is required' } } });
      }
      if (current.some((c) => String(c?.uid || '').toLowerCase() === normalized.toLowerCase())) {
        return res.status(409).json({ errors: { uid: { msg: 'UID already in whitelist' } } });
      }

      const item = {
        id: crypto.randomUUID(),
        uid: normalized,
        name: typeof name === 'string' ? name.trim() : '',
        type: typeof type === 'string' ? type.trim() : 'Digitale',
        addedAt: new Date().toISOString(),
      };

      const updated = await prisma.chargingStation.update({
        where: { id: station.id },
        data: { rfidWhitelist: [...current, item] },
        select: { id: true, rfidWhitelist: true },
      });

      return res.status(201).json({ data: updated.rfidWhitelist });
    }

    if (method === 'DELETE') {
      const { id: cardId, ids } = req.body || {};
      const removeIds = new Set(
        []
          .concat(typeof cardId === 'string' ? [cardId] : [])
          .concat(Array.isArray(ids) ? ids : [])
          .filter((x) => typeof x === 'string' && x.length > 0)
      );

      if (removeIds.size === 0) {
        return res.status(400).json({ errors: { ids: { msg: 'id or ids required' } } });
      }

      const next = current.filter((c) => !removeIds.has(String(c?.id || '')));
      const updated = await prisma.chargingStation.update({
        where: { id: station.id },
        data: { rfidWhitelist: next },
        select: { id: true, rfidWhitelist: true },
      });

      return res.status(200).json({ data: updated.rfidWhitelist });
    }

    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  } catch (error) {
    console.error(`${method} /api/admin/stations/[id]/whitelist error:`, error);
    if (!res.headersSent) {
      const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }
};

export default handler;

