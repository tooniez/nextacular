#!/usr/bin/env node
/**
 * Simple platform simulator:
 * - ensures at least one CHARGING session exists
 * - "ticks" CHARGING sessions -> COMPLETED with billing + CAPTURED payment
 *
 * Usage:
 *   node scripts/simulator.js
 */

const { PrismaClient, SessionStatus, BillingStatus, PaymentStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function ensureChargingSession() {
  const existing = await prisma.chargingSession.findFirst({
    where: { status: SessionStatus.CHARGING, endTime: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const station = await prisma.chargingStation.findFirst({
    where: { deletedAt: null },
    include: { connectors: { take: 1, orderBy: { connectorId: 'asc' } }, workspace: true },
  });
  if (!station || !station.connectors?.[0]) {
    throw new Error('No station/connector found to create a charging session. Run seed first.');
  }

  const tariff = await prisma.tariffProfile.findFirst({
    where: { workspaceId: station.workspaceId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const endUser = await prisma.endUser.findFirst({ orderBy: { createdAt: 'asc' } });

  const now = new Date();
  const id = `sim-charging-${station.workspace.slug}-${now.getTime()}`;

  await prisma.chargingSession.create({
    data: {
      id,
      workspaceId: station.workspaceId,
      stationId: station.id,
      connectorId: station.connectors[0].id,
      endUserId: endUser?.id || null,
      startTime: new Date(now.getTime() - 8 * 60 * 1000),
      endTime: null,
      durationSeconds: null,
      energyKwh: 0.4,
      status: SessionStatus.CHARGING,
      billingStatus: BillingStatus.NOT_BILLED,
      paymentStatus: PaymentStatus.HOLD_OK,
      holdAmountCents: 5000,
      tariffSnapshotId: tariff?.id || null,
      tariffBasePricePerKwh: tariff?.basePricePerKwh || 0.45,
      tariffMsFeePercent: tariff?.msFeePercent || 15,
      currency: 'EUR',
    },
  });

  return id;
}

async function tickChargingSessions() {
  const sessions = await prisma.chargingSession.findMany({
    where: { status: SessionStatus.CHARGING, endTime: null },
    include: {
      workspace: { select: { slug: true } },
      tariffSnapshot: { select: { basePricePerKwh: true, msFeePercent: true } },
    },
    take: 20,
  });

  if (sessions.length === 0) {
    console.log('[sim] No CHARGING sessions found');
    return 0;
  }

  const now = new Date();
  for (const s of sessions) {
    const start = new Date(s.startTime);
    const rawDuration = Math.floor((now - start) / 1000);
    // Keep simulation realistic even if an old CHARGING session exists
    const durationSeconds = Math.max(60, Math.min(rawDuration, 3 * 3600));
    const energyKwh = round2(Math.min(60, (s.energyKwh || 0) + Math.max(0.5, (durationSeconds / 3600) * 7)));

    const pricePerKwh = s.tariffBasePricePerKwh || s.tariffSnapshot?.basePricePerKwh || 0.45;
    const msFeePercent = s.tariffMsFeePercent || s.tariffSnapshot?.msFeePercent || 15;

    const gross = round2(energyKwh * pricePerKwh);
    const msFee = round2((gross * msFeePercent) / 100);
    const subCpo = round2(gross - msFee);

    await prisma.chargingSession.update({
      where: { id: s.id },
      data: {
        endTime: now,
        durationSeconds,
        energyKwh,
        status: SessionStatus.COMPLETED,
        stopReason: 'REMOTE',
        billingStatus: BillingStatus.BILLED,
        billedAt: now,
        grossAmount: gross,
        msFeeAmount: msFee,
        subCpoEarningAmount: subCpo,
        paymentStatus: PaymentStatus.CAPTURED,
        capturedAmountCents: Math.round(gross * 100),
        paidAt: now,
      },
    });

    console.log(`[sim] Closed session ${s.id} (ws=${s.workspace?.slug}) gross=${gross}€ kWh=${energyKwh}`);
  }

  return sessions.length;
}

async function main() {
  console.log('=== MSolution simulator ===');
  const createdId = await ensureChargingSession();
  console.log('[sim] ensured CHARGING session:', createdId);
  const closed = await tickChargingSessions();
  console.log('[sim] sessions closed:', closed);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[sim] error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

