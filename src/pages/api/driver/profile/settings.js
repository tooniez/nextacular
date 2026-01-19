/**
 * Driver app settings (stored in EndUser.preferences JSON).
 *
 * GET  -> returns normalized settings
 * PATCH -> partial update { settings }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const DEFAULTS = Object.freeze({
  language: 'it', // it | en
  notifications: {
    emailReceipts: true,
    push: false, // stored only (no push infra yet)
  },
  mapDefaults: {
    onlyAvailable: false,
    favoritesOnly: false,
    connectorType: 'ANY', // ANY | Type2 | CCS | CHAdeMO
    minPower: 0, // kW
  },
});

function safeBool(v, fallback) {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function safeStr(v, fallback, allowed = null) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return fallback;
  if (Array.isArray(allowed) && !allowed.includes(s)) return fallback;
  return s;
}

function safeNum(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeSettings(rawPrefs) {
  const prefs = rawPrefs && typeof rawPrefs === 'object' ? rawPrefs : {};
  const driver = prefs.driverApp && typeof prefs.driverApp === 'object' ? prefs.driverApp : {};

  return {
    language: safeStr(driver.language, DEFAULTS.language, ['it', 'en']),
    notifications: {
      emailReceipts: safeBool(driver.notifications?.emailReceipts, DEFAULTS.notifications.emailReceipts),
      push: safeBool(driver.notifications?.push, DEFAULTS.notifications.push),
    },
    mapDefaults: {
      onlyAvailable: safeBool(driver.mapDefaults?.onlyAvailable, DEFAULTS.mapDefaults.onlyAvailable),
      favoritesOnly: safeBool(driver.mapDefaults?.favoritesOnly, DEFAULTS.mapDefaults.favoritesOnly),
      connectorType: safeStr(driver.mapDefaults?.connectorType, DEFAULTS.mapDefaults.connectorType, ['ANY', 'Type2', 'CCS', 'CHAdeMO']),
      minPower: safeNum(driver.mapDefaults?.minPower, DEFAULTS.mapDefaults.minPower, 0, 350),
    },
  };
}

function mergeSettingsIntoPrefs(existingPrefs, nextSettings) {
  const prefs = existingPrefs && typeof existingPrefs === 'object' ? existingPrefs : {};
  const current = normalizeSettings(prefs);
  const incoming = nextSettings && typeof nextSettings === 'object' ? nextSettings : {};

  const merged = {
    language: incoming.language !== undefined ? safeStr(incoming.language, current.language, ['it', 'en']) : current.language,
    notifications: {
      emailReceipts:
        incoming.notifications?.emailReceipts !== undefined
          ? safeBool(incoming.notifications.emailReceipts, current.notifications.emailReceipts)
          : current.notifications.emailReceipts,
      push: incoming.notifications?.push !== undefined ? safeBool(incoming.notifications.push, current.notifications.push) : current.notifications.push,
    },
    mapDefaults: {
      onlyAvailable:
        incoming.mapDefaults?.onlyAvailable !== undefined
          ? safeBool(incoming.mapDefaults.onlyAvailable, current.mapDefaults.onlyAvailable)
          : current.mapDefaults.onlyAvailable,
      favoritesOnly:
        incoming.mapDefaults?.favoritesOnly !== undefined
          ? safeBool(incoming.mapDefaults.favoritesOnly, current.mapDefaults.favoritesOnly)
          : current.mapDefaults.favoritesOnly,
      connectorType:
        incoming.mapDefaults?.connectorType !== undefined
          ? safeStr(incoming.mapDefaults.connectorType, current.mapDefaults.connectorType, ['ANY', 'Type2', 'CCS', 'CHAdeMO'])
          : current.mapDefaults.connectorType,
      minPower:
        incoming.mapDefaults?.minPower !== undefined
          ? safeNum(incoming.mapDefaults.minPower, current.mapDefaults.minPower, 0, 350)
          : current.mapDefaults.minPower,
    },
  };

  return {
    ...prefs,
    driverApp: merged,
  };
}

export default async function handler(req, res) {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method === 'GET') {
    const settings = normalizeSettings(endUser.preferences);
    return res.status(200).json({ data: settings });
  }

  if (method !== 'PATCH') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const settings = req.body?.settings;
  if (settings === undefined) {
    return res.status(400).json({ errors: { settings: { msg: 'settings required' } } });
  }

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'driver-settings',
      hypothesisId: 'SET_1',
      location: 'api/driver/profile/settings.js',
      message: 'patch settings',
      data: {
        hasLanguage: settings?.language !== undefined,
        hasNotif: settings?.notifications !== undefined,
        hasMap: settings?.mapDefaults !== undefined,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const nextPrefs = mergeSettingsIntoPrefs(endUser.preferences, settings);
  const updated = await prisma.endUser.update({
    where: { id: endUser.id },
    data: { preferences: nextPrefs },
    select: { id: true, preferences: true },
  });

  return res.status(200).json({ data: normalizeSettings(updated.preferences) });
}

