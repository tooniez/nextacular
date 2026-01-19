import prisma from '@/prisma/index';
import { roundToCents } from './billing';

/**
 * Generate payout statement preview (dry run) or commit
 * @param {object} params
 * @param {string} params.workspaceId - Workspace ID
 * @param {Date} params.periodStart - Period start date
 * @param {Date} params.periodEnd - Period end date
 * @param {string} params.createdByUserId - User ID creating the statement
 * @param {string} params.mode - "dry_run" | "commit"
 * @returns {Promise<object>} Preview or created statement
 */
export async function generatePayoutStatement({ workspaceId, periodStart, periodEnd, createdByUserId, mode = 'dry_run' }) {
  const startDate = periodStart instanceof Date ? periodStart : new Date(periodStart);
  const endDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);

  // Check if statement already exists for this period
  const existing = await prisma.payoutStatement.findUnique({
    where: {
      workspaceId_periodStart_periodEnd: {
        workspaceId,
        periodStart: startDate,
        periodEnd: endDate,
      },
    },
  });

  if (existing && existing.status !== 'DRAFT') {
    throw new Error(`Payout statement already exists for this period with status ${existing.status}`);
  }

  // Find eligible sessions
  // If updating existing DRAFT, include sessions already linked to it
  const wherePayoutStatementId = existing && existing.status === 'DRAFT'
    ? { OR: [{ payoutStatementId: null }, { payoutStatementId: existing.id }] }
    : { payoutStatementId: null };

  const sessions = await prisma.chargingSession.findMany({
    where: {
      workspaceId,
      status: 'COMPLETED',
      billingStatus: 'BILLED',
      // Payment filter: non-roaming uses Stripe CAPTURED, INBOUND uses clearing SETTLED
      OR: [
        // Non-roaming: Stripe CAPTURED
        {
          roamingType: 'NONE',
          paymentStatus: 'CAPTURED',
          paidAt: { not: null },
        },
        // INBOUND: Clearing SETTLED
        {
          roamingType: 'INBOUND',
          clearingStatus: 'SETTLED',
          clearingSettledAt: { not: null },
        },
      ],
      // OUTBOUND excluded (doesn't enter Sub-CPO payout)
      roamingType: { not: 'OUTBOUND' },
      billedAt: {
        gte: startDate,
        lt: endDate,
      },
      ...wherePayoutStatementId,
    },
    include: {
      station: {
        select: {
          name: true,
          ocppId: true,
        },
      },
    },
    orderBy: { billedAt: 'asc' },
  });

  // Check currency consistency
  const currencies = [...new Set(sessions.map(s => s.currency).filter(Boolean))];
  if (currencies.length > 1) {
    throw new Error(`Multiple currencies found: ${currencies.join(', ')}. All sessions must use the same currency.`);
  }
  const currency = currencies[0] || 'EUR';

  // Calculate totals
  let totalsGross = 0;
  let totalsMsFee = 0;
  let totalsSubCpo = 0;
  let totalsKwh = 0;

  const lineItemsPreview = sessions.map((session) => {
    const gross = session.grossAmount || 0;
    const msFee = session.msFeeAmount || 0;
    const subCpo = session.subCpoEarningAmount || 0;
    const kwh = session.energyKwh || 0;

    totalsGross += gross;
    totalsMsFee += msFee;
    totalsSubCpo += subCpo;
    totalsKwh += kwh;

    return {
      sessionId: session.id,
      sessionStartTime: session.startTime,
      stationName: session.station?.name || session.station?.ocppId || 'Unknown',
      energyKwh: kwh,
      grossAmount: gross,
      msFeeAmount: msFee,
      subCpoEarning: subCpo,
      currency: session.currency || currency,
    };
  });

  const totals = {
    totalSessions: sessions.length,
    totalEnergyKwh: roundToCents(totalsKwh),
    totalGrossAmount: roundToCents(totalsGross),
    totalMsFeeAmount: roundToCents(totalsMsFee),
    totalSubCpoEarning: roundToCents(totalsSubCpo),
    currency,
  };

  // If dry run, return preview
  if (mode === 'dry_run') {
    return {
      preview: true,
      periodStart: startDate,
      periodEnd: endDate,
      totals,
      lineItemsCount: lineItemsPreview.length,
      lineItems: lineItemsPreview.slice(0, 10), // First 10 for preview
    };
  }

  // Commit: create statement and line items
  if (existing && existing.status === 'DRAFT') {
    // Update existing DRAFT statement
    // First, remove payoutStatementId from previously linked sessions
    await prisma.chargingSession.updateMany({
      where: { payoutStatementId: existing.id },
      data: { payoutStatementId: null },
    });

    await prisma.payoutLineItem.deleteMany({
      where: { statementId: existing.id },
    });

    const updated = await prisma.payoutStatement.update({
      where: { id: existing.id },
      data: {
        ...totals,
        updatedAt: new Date(),
      },
    });

    // Create line items
    await prisma.payoutLineItem.createMany({
      data: lineItemsPreview.map((item) => ({
        statementId: updated.id,
        sessionId: item.sessionId,
        sessionStartTime: item.sessionStartTime,
        stationName: item.stationName,
        energyKwh: item.energyKwh,
        grossAmount: item.grossAmount,
        msFeeAmount: item.msFeeAmount,
        subCpoEarning: item.subCpoEarning,
        currency: item.currency,
      })),
    });

    // Update sessions with payoutStatementId
    await prisma.chargingSession.updateMany({
      where: {
        id: { in: sessions.map(s => s.id) },
      },
      data: {
        payoutStatementId: updated.id,
      },
    });

    return await prisma.payoutStatement.findUnique({
      where: { id: updated.id },
      include: {
        lineItems: {
          take: 10,
          orderBy: { sessionStartTime: 'asc' },
        },
      },
    });
  }

  // Create new statement
  const statement = await prisma.payoutStatement.create({
    data: {
      workspaceId,
      periodStart: startDate,
      periodEnd: endDate,
      status: 'DRAFT',
      ...totals,
    },
  });

  // Create line items
  await prisma.payoutLineItem.createMany({
    data: lineItemsPreview.map((item) => ({
      statementId: statement.id,
      sessionId: item.sessionId,
      sessionStartTime: item.sessionStartTime,
      stationName: item.stationName,
      energyKwh: item.energyKwh,
      grossAmount: item.grossAmount,
      msFeeAmount: item.msFeeAmount,
      subCpoEarning: item.subCpoEarning,
      currency: item.currency,
    })),
  });

  // Update sessions with payoutStatementId
  await prisma.chargingSession.updateMany({
    where: {
      id: { in: sessions.map(s => s.id) },
    },
    data: {
      payoutStatementId: statement.id,
    },
  });

  return await prisma.payoutStatement.findUnique({
    where: { id: statement.id },
    include: {
      lineItems: {
        take: 10,
        orderBy: { sessionStartTime: 'asc' },
      },
    },
  });
}

/**
 * Recalculate payout statement (only if DRAFT)
 * @param {string} statementId - Statement ID
 * @returns {Promise<object>} Updated statement
 */
export async function recalculatePayoutStatement(statementId) {
  const statement = await prisma.payoutStatement.findUnique({
    where: { id: statementId },
    include: { lineItems: true },
  });

  if (!statement) {
    throw new Error('Payout statement not found');
  }

  if (statement.status !== 'DRAFT') {
    throw new Error(`Cannot recalculate statement with status ${statement.status}`);
  }

  // Recalculate from line items
  const totals = statement.lineItems.reduce(
    (acc, item) => ({
      totalSessions: acc.totalSessions + 1,
      totalEnergyKwh: acc.totalEnergyKwh + item.energyKwh,
      totalGrossAmount: acc.totalGrossAmount + item.grossAmount,
      totalMsFeeAmount: acc.totalMsFeeAmount + item.msFeeAmount,
      totalSubCpoEarning: acc.totalSubCpoEarning + item.subCpoEarning,
    }),
    {
      totalSessions: 0,
      totalEnergyKwh: 0,
      totalGrossAmount: 0,
      totalMsFeeAmount: 0,
      totalSubCpoEarning: 0,
    }
  );

  return await prisma.payoutStatement.update({
    where: { id: statementId },
    data: {
      totalSessions: totals.totalSessions,
      totalEnergyKwh: roundToCents(totals.totalEnergyKwh),
      totalGrossAmount: roundToCents(totals.totalGrossAmount),
      totalMsFeeAmount: roundToCents(totals.totalMsFeeAmount),
      totalSubCpoEarning: roundToCents(totals.totalSubCpoEarning),
      updatedAt: new Date(),
    },
  });
}

/**
 * Issue payout statement (DRAFT -> ISSUED)
 * @param {string} statementId - Statement ID
 * @returns {Promise<object>} Updated statement
 */
export async function issuePayoutStatement(statementId) {
  const statement = await prisma.payoutStatement.findUnique({
    where: { id: statementId },
  });

  if (!statement) {
    throw new Error('Payout statement not found');
  }

  if (statement.status !== 'DRAFT') {
    throw new Error(`Cannot issue statement with status ${statement.status}`);
  }

  return await prisma.payoutStatement.update({
    where: { id: statementId },
    data: {
      status: 'ISSUED',
      finalizedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark payout as paid (ISSUED -> PAID)
 * @param {string} statementId - Statement ID
 * @param {Date} paidAt - Payment date
 * @param {string} reference - Payment reference (optional)
 * @returns {Promise<object>} Updated statement
 */
export async function markPayoutPaid(statementId, paidAt, reference = null) {
  const statement = await prisma.payoutStatement.findUnique({
    where: { id: statementId },
  });

  if (!statement) {
    throw new Error('Payout statement not found');
  }

  if (statement.status !== 'ISSUED') {
    throw new Error(`Cannot mark as paid statement with status ${statement.status}`);
  }

  const paidDate = paidAt instanceof Date ? paidAt : new Date(paidAt);

  return await prisma.payoutStatement.update({
    where: { id: statementId },
    data: {
      status: 'PAID',
      payoutDate: paidDate,
      payoutReference: reference,
      payoutAmount: statement.totalSubCpoEarning, // Default to sub-CPO earning
      updatedAt: new Date(),
    },
  });
}

/**
 * Cancel payout statement (DRAFT/ISSUED -> CANCELLED)
 * @param {string} statementId - Statement ID
 * @returns {Promise<object>} Updated statement
 */
export async function cancelPayoutStatement(statementId) {
  const statement = await prisma.payoutStatement.findUnique({
    where: { id: statementId },
  });

  if (!statement) {
    throw new Error('Payout statement not found');
  }

  if (statement.status === 'PAID') {
    throw new Error('Cannot cancel a paid statement');
  }

  // Remove payoutStatementId from sessions
  await prisma.chargingSession.updateMany({
    where: { payoutStatementId: statementId },
    data: { payoutStatementId: null },
  });

  return await prisma.payoutStatement.update({
    where: { id: statementId },
    data: {
      status: 'CANCELLED',
      updatedAt: new Date(),
    },
  });
}

/**
 * Get payout statements for workspace
 * @param {string} workspaceId - Workspace ID
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Paginated statements
 */
export async function getPayoutStatements(workspaceId, filters = {}) {
  const {
    status = null,
    from = null,
    to = null,
    page = 1,
    pageSize = 20,
  } = filters;

  const where = {
    workspaceId,
  };

  if (status) {
    where.status = status;
  }

  if (from || to) {
    where.periodStart = {};
    if (from) {
      where.periodStart.gte = new Date(from);
    }
    if (to) {
      where.periodStart.lte = new Date(to);
    }
  }

  const total = await prisma.payoutStatement.count({ where });

  const skip = (page - 1) * pageSize;
  const statements = await prisma.payoutStatement.findMany({
    where,
    orderBy: { periodStart: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    data: statements,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get payout statement by ID
 * @param {string} statementId - Statement ID
 * @param {string} workspaceId - Workspace ID (for security)
 * @returns {Promise<object|null>} Statement or null
 */
export async function getPayoutStatement(statementId, workspaceId) {
  const statement = await prisma.payoutStatement.findFirst({
    where: {
      id: statementId,
      workspaceId,
    },
    include: {
      lineItems: {
        orderBy: { sessionStartTime: 'asc' },
      },
    },
  });

  return statement;
}
