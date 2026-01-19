/**
 * Clearing Service
 * Handles CDR matching, verification, and settlement reconciliation
 * Used for Hubject roaming sessions
 */

const prisma = require('../index');

/**
 * Verify CDR match with ChargingSession
 * @param {object} session - ChargingSession
 * @param {object} cdr - CDR data from Hubject
 * @returns {object} { match: boolean, mismatches: string[], verified: object }
 */
function verifyCdrMatch(session, cdr) {
  const mismatches = [];
  const verified = {};

  // Tolerance thresholds
  const ENERGY_TOLERANCE_KWH = 0.1; // ±0.1 kWh
  const DURATION_TOLERANCE_SEC = 60; // ±60 seconds
  const AMOUNT_TOLERANCE_EUR = 0.01; // ±0.01 EUR

  // Verify energy (kWh)
  const sessionEnergy = session.energyKwh || 0;
  const cdrEnergy = cdr.energyKwh || 0;
  const energyDiff = Math.abs(sessionEnergy - cdrEnergy);
  verified.energyKwh = {
    session: sessionEnergy,
    cdr: cdrEnergy,
    diff: energyDiff,
    tolerance: ENERGY_TOLERANCE_KWH,
    match: energyDiff <= ENERGY_TOLERANCE_KWH,
  };
  if (energyDiff > ENERGY_TOLERANCE_KWH) {
    mismatches.push(`Energy mismatch: session=${sessionEnergy} kWh, cdr=${cdrEnergy} kWh, diff=${energyDiff.toFixed(3)} kWh`);
  }

  // Verify duration (seconds)
  const sessionDuration = session.durationSeconds || 0;
  const cdrDuration = cdr.durationSeconds || 0;
  const durationDiff = Math.abs(sessionDuration - cdrDuration);
  verified.durationSeconds = {
    session: sessionDuration,
    cdr: cdrDuration,
    diff: durationDiff,
    tolerance: DURATION_TOLERANCE_SEC,
    match: durationDiff <= DURATION_TOLERANCE_SEC,
  };
  if (durationDiff > DURATION_TOLERANCE_SEC) {
    mismatches.push(`Duration mismatch: session=${sessionDuration}s, cdr=${cdrDuration}s, diff=${durationDiff}s`);
  }

  // Verify amounts (EUR)
  const sessionGross = session.grossAmount || 0;
  const cdrGross = cdr.grossAmount || 0;
  const amountDiff = Math.abs(sessionGross - cdrGross);
  verified.grossAmount = {
    session: sessionGross,
    cdr: cdrGross,
    diff: amountDiff,
    tolerance: AMOUNT_TOLERANCE_EUR,
    match: amountDiff <= AMOUNT_TOLERANCE_EUR,
  };
  if (amountDiff > AMOUNT_TOLERANCE_EUR) {
    mismatches.push(`Amount mismatch: session=${sessionGross} EUR, cdr=${cdrGross} EUR, diff=${amountDiff.toFixed(2)} EUR`);
  }

  // Verify timestamps (start time should be close)
  const sessionStart = new Date(session.startTime);
  const cdrStart = new Date(cdr.startTime);
  const timeDiff = Math.abs(sessionStart - cdrStart) / 1000; // seconds
  verified.startTime = {
    session: sessionStart.toISOString(),
    cdr: cdrStart.toISOString(),
    diffSeconds: timeDiff,
    match: timeDiff <= 300, // 5 minutes tolerance
  };
  if (timeDiff > 300) {
    mismatches.push(`Start time mismatch: session=${sessionStart.toISOString()}, cdr=${cdrStart.toISOString()}, diff=${timeDiff.toFixed(0)}s`);
  }

  const match = mismatches.length === 0;

  return {
    match,
    mismatches,
    verified,
  };
}

/**
 * Calculate clearing amounts from CDR
 * @param {object} session - ChargingSession
 * @param {object} cdr - CDR data from Hubject
 * @returns {object} { gross, net, fees, currency }
 */
function calculateClearingAmounts(session, cdr) {
  // Use CDR amounts as source of truth for clearing
  const gross = cdr.grossAmount || session.grossAmount || 0;
  const net = cdr.netAmount || gross; // Net after Hubject fees (if provided)
  const fees = gross - net; // Hubject clearing fees

  return {
    gross,
    net,
    fees,
    currency: cdr.currency || session.currency || 'EUR',
  };
}

/**
 * Reconcile settlement from Hubject
 * @param {string} sessionId - ChargingSession ID
 * @param {object} settlementData - Settlement data from Hubject
 * @returns {Promise<object>} Updated ChargingSession
 */
async function reconcileSettlement(sessionId, settlementData) {
  const {
    hubjectSessionId,
    cdrData,
    clearingReference,
    settledAt,
  } = settlementData;

  // Get session
  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Verify hubjectSessionId matches
  if (session.hubjectSessionId !== hubjectSessionId) {
    throw new Error(`Hubject session ID mismatch: session=${session.hubjectSessionId}, settlement=${hubjectSessionId}`);
  }

  // Verify CDR match
  const matchResult = verifyCdrMatch(session, cdrData);

  // Calculate clearing amounts
  const clearingAmounts = calculateClearingAmounts(session, cdrData);

  // Determine clearing status
  let clearingStatus = 'SETTLED';
  let disputeReason = null;

  if (!matchResult.match) {
    clearingStatus = 'DISPUTED';
    disputeReason = `CDR mismatch detected: ${matchResult.mismatches.join('; ')}`;
  }

  // Update session
  const updatedSession = await prisma.chargingSession.update({
    where: { id: sessionId },
    data: {
      roamingGrossAmount: clearingAmounts.gross,
      roamingNetAmount: clearingAmounts.net,
      clearingStatus,
      clearingReference,
      clearingSettledAt: settledAt || new Date(),
      clearingDisputeReason: disputeReason,
      // Update energy/duration from CDR if provided (CDR is source of truth)
      ...(cdrData.energyKwh && { energyKwh: cdrData.energyKwh }),
      ...(cdrData.durationSeconds && { durationSeconds: cdrData.durationSeconds }),
      // Update amounts from CDR if match OK
      ...(matchResult.match && {
        grossAmount: clearingAmounts.gross,
        currency: clearingAmounts.currency,
      }),
    },
  });

  return {
    session: updatedSession,
    matchResult,
    clearingAmounts,
  };
}

module.exports = {
  verifyCdrMatch,
  calculateClearingAmounts,
  reconcileSettlement,
};
