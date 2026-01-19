/**
 * Hubject Roaming Service
 * Handles Hubject OICP roaming sessions (INBOUND and OUTBOUND)
 * 
 * IMPORTANT: This service does NOT directly interact with Hubject API.
 * It handles the business logic for roaming sessions.
 * API calls to Hubject are handled by separate API routes.
 */

const prisma = require('../index');
const { resolveActiveTariff, createTariffSnapshotJson } = require('../../apps/ocpp/services/tariff-resolver');
const { computeSessionAmounts, createBillingBreakdownJson } = require('../../apps/ocpp/services/billing');
const paymentApi = require('../../apps/ocpp/services/payment-api');

/**
 * Create INBOUND roaming session (EMP → MSolution)
 * @param {object} params
 * @param {string} params.workspaceId - Workspace ID (Sub-CPO)
 * @param {string} params.stationId - ChargingStation ID
 * @param {string} params.connectorId - Connector ID
 * @param {string} params.hubjectSessionId - Hubject session ID (unique, idempotency key)
 * @param {string} params.empId - EMP ID (external driver)
 * @param {string} params.rfidToken - RFID token from EMP
 * @param {number} params.meterStart - OCPP meter start
 * @param {Date} params.timestamp - Session start timestamp
 * @param {object} params.roamingTariff - Roaming tariff snapshot (optional)
 * @returns {Promise<object>} ChargingSession
 */
async function createInboundSession(params) {
  const {
    workspaceId,
    stationId,
    connectorId,
    hubjectSessionId,
    empId,
    rfidToken,
    meterStart,
    timestamp,
    roamingTariff,
  } = params;

  // Idempotency check: session already exists?
  const existing = await prisma.chargingSession.findUnique({
    where: { hubjectSessionId },
  });

  if (existing) {
    return existing; // Idempotent: return existing session
  }

  // Resolve active tariff for this station/connector
  const activeTariff = roamingTariff || await resolveActiveTariff(
    workspaceId,
    stationId,
    connectorId,
    timestamp || new Date()
  );

  // Create tariff snapshot JSON
  const snapshotJson = createTariffSnapshotJson(activeTariff);

  // Generate OCPP transaction ID (if not provided, use timestamp-based)
  const ocppTransactionId = params.ocppTransactionId || (Date.now() % 1000000);

  // Create session with roaming metadata
  const session = await prisma.chargingSession.create({
    data: {
      workspaceId,
      stationId,
      connectorId,
      endUserId: null, // INBOUND: no MSolution EndUser
      rfidToken: rfidToken || null,
      ocppTransactionId,
      ocppIdTag: rfidToken || null,
      startTime: timestamp || new Date(),
      meterStart: meterStart || null,
      status: 'ACTIVE',
      // Tariff snapshot
      tariffSnapshotId: activeTariff?.id || null,
      tariffBasePricePerKwh: activeTariff?.basePricePerKwh || null,
      tariffPricePerMinute: activeTariff?.pricePerMinute || null,
      tariffSessionStartFee: activeTariff?.sessionStartFee || null,
      tariffMsFeePercent: activeTariff?.msFeePercent || null,
      tariffCurrency: activeTariff?.currency || 'EUR',
      tariffSnapshotJson: snapshotJson,
      // Roaming metadata
      roamingType: 'INBOUND',
      roamingProvider: 'HUBJECT',
      hubjectSessionId,
      empId,
      clearingStatus: 'PENDING',
      // Payment: NONE for INBOUND (clearing via Hubject)
      paymentStatus: 'NONE',
    },
  });

  return session;
}

/**
 * Close INBOUND roaming session
 * @param {string} sessionId - ChargingSession ID
 * @param {object} params
 * @param {number} params.meterStop - OCPP meter stop
 * @param {Date} params.timestamp - Session stop timestamp
 * @param {string} params.stopReason - Stop reason
 * @returns {Promise<object>} Updated ChargingSession
 */
async function closeInboundSession(sessionId, params) {
  const { meterStop, timestamp, stopReason } = params;

  // Get session
  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.roamingType !== 'INBOUND') {
    throw new Error(`Session ${sessionId} is not an INBOUND roaming session`);
  }

  // Calculate energy and duration
  const meterStart = session.meterStart || 0;
  const meterStopValue = meterStop || meterStart;
  const energyKwh = (meterStopValue - meterStart) / 1000.0; // OCPP uses Wh

  const startTime = session.startTime;
  const endTime = timestamp || new Date();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  // Compute billing if tariff snapshot is present
  let billingData = {};
  if (session.tariffSnapshotJson) {
    try {
      const tariffSnapshot = JSON.parse(session.tariffSnapshotJson);
      const billing = computeSessionAmounts({
        energyKwh: energyKwh > 0 ? energyKwh : 0,
        durationSeconds,
        idleSeconds: 0,
        snapshot: tariffSnapshot,
      });

      const billingBreakdownJson = createBillingBreakdownJson(billing, {
        id: session.id,
        status: 'COMPLETED',
      });

      billingData = {
        grossAmount: billing.grossAmount,
        msFeeAmount: billing.msFeeAmount,
        subCpoEarningAmount: billing.subCpoEarningAmount,
        currency: billing.currency,
        billingBreakdownJson,
        billedAt: new Date(),
        billingStatus: 'BILLED',
      };
    } catch (error) {
      console.error(`[closeInboundSession] Billing computation failed:`, error);
      billingData.billingStatus = 'BILLING_ERROR';
    }
  }

  // Update session
  const updatedSession = await prisma.chargingSession.update({
    where: { id: sessionId },
    data: {
      endTime,
      durationSeconds,
      energyKwh: energyKwh > 0 ? energyKwh : null,
      meterStop: meterStopValue,
      status: 'COMPLETED',
      stopReason: stopReason || 'OTHER',
      ...billingData,
      // Clearing status remains PENDING until CDR arrives
      clearingStatus: 'PENDING',
    },
  });

  return updatedSession;
}

/**
 * Create OUTBOUND roaming session (MSolution → CPO esterno)
 * @param {object} params
 * @param {string} params.workspaceId - Workspace ID
 * @param {string} params.endUserId - EndUser ID (MSolution driver)
 * @param {string} params.hubjectSessionId - Hubject session ID
 * @param {string} params.cpoId - External CPO ID
 * @param {string} params.rfidToken - RFID token MSolution
 * @param {object} params.stationInfo - External station info (for reference)
 * @param {Date} params.timestamp - Session start timestamp
 * @returns {Promise<object>} ChargingSession
 */
async function createOutboundSession(params) {
  const {
    workspaceId,
    endUserId,
    hubjectSessionId,
    cpoId,
    rfidToken,
    stationInfo,
    timestamp,
  } = params;

  // Idempotency check
  const existing = await prisma.chargingSession.findUnique({
    where: { hubjectSessionId },
  });

  if (existing) {
    return existing;
  }

  // Get EndUser with payment profile
  const endUser = await prisma.endUser.findUnique({
    where: { id: endUserId },
    include: { paymentProfile: true },
  });

  if (!endUser) {
    throw new Error(`EndUser ${endUserId} not found`);
  }

  // Estimate hold amount (use default or from params)
  const estimatedAmountEur = params.estimatedAmountEur || 50.0; // Default 50 EUR

  // Create Payment HOLD (Stripe)
  let paymentData = {
    paymentStatus: 'NONE',
  };

  if (endUser.paymentProfile?.stripeCustomerId && endUser.paymentProfile?.stripePaymentMethodId) {
    try {
      const holdResult = await paymentApi.createHold({
        endUserId,
        amountEur: estimatedAmountEur,
        currency: 'EUR',
      });

      if (holdResult.error) {
        console.warn(`[createOutboundSession] Payment HOLD failed: ${holdResult.error}`);
        paymentData.paymentStatus = 'FAILED';
        paymentData.paymentLastErrorMessage = holdResult.error;
      } else if (holdResult.paymentIntentId) {
        paymentData.paymentStatus = holdResult.status || 'HOLD_OK';
        paymentData.stripePaymentIntentId = holdResult.paymentIntentId;
        paymentData.holdAmountCents = holdResult.amountCents;
      }
    } catch (error) {
      console.error(`[createOutboundSession] Payment HOLD error:`, error);
      paymentData.paymentStatus = 'FAILED';
      paymentData.paymentLastErrorMessage = error.message;
    }
  }

  // Create session (OUTBOUND doesn't have local station/connector)
  // Use placeholder station/connector or create virtual ones
  // For now, we'll require stationId/connectorId to be provided
  // In production, these might be virtual stations for outbound tracking

  const session = await prisma.chargingSession.create({
    data: {
      workspaceId,
      stationId: params.stationId || 'virtual-outbound', // Virtual station for outbound
      connectorId: params.connectorId || 'virtual-outbound-1',
      endUserId,
      rfidToken: rfidToken || null,
      ocppTransactionId: params.ocppTransactionId || (Date.now() % 1000000),
      ocppIdTag: rfidToken || null,
      startTime: timestamp || new Date(),
      meterStart: params.meterStart || null,
      status: 'ACTIVE',
      // Roaming metadata
      roamingType: 'OUTBOUND',
      roamingProvider: 'HUBJECT',
      hubjectSessionId,
      cpoId,
      clearingStatus: 'PENDING',
      // Payment data
      ...paymentData,
    },
  });

  return session;
}

/**
 * Close OUTBOUND roaming session
 * @param {string} sessionId - ChargingSession ID
 * @param {object} params
 * @param {object} params.cdrData - CDR data from Hubject
 * @param {Date} params.timestamp - Session stop timestamp
 * @param {string} params.stopReason - Stop reason
 * @returns {Promise<object>} Updated ChargingSession
 */
async function closeOutboundSession(sessionId, params) {
  const { cdrData, timestamp, stopReason } = params;

  // Get session
  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.roamingType !== 'OUTBOUND') {
    throw new Error(`Session ${sessionId} is not an OUTBOUND roaming session`);
  }

  // Use CDR data as source of truth
  const energyKwh = cdrData.energyKwh || 0;
  const durationSeconds = cdrData.durationSeconds || 0;
  const endTime = timestamp || new Date();

  // Compute billing from CDR data
  // For OUTBOUND, we need to use the tariff that MSolution charges the driver
  // (not the tariff from external CPO)
  let billingData = {};
  
  if (session.tariffSnapshotJson) {
    try {
      const tariffSnapshot = JSON.parse(session.tariffSnapshotJson);
      const billing = computeSessionAmounts({
        energyKwh,
        durationSeconds,
        idleSeconds: 0,
        snapshot: tariffSnapshot,
      });

      const billingBreakdownJson = createBillingBreakdownJson(billing, {
        id: session.id,
        status: 'COMPLETED',
      });

      billingData = {
        grossAmount: billing.grossAmount,
        msFeeAmount: billing.msFeeAmount,
        subCpoEarningAmount: 0, // OUTBOUND: Sub-CPO doesn't earn (not their station)
        currency: billing.currency,
        billingBreakdownJson,
        billedAt: new Date(),
        billingStatus: 'BILLED',
      };
    } catch (error) {
      console.error(`[closeOutboundSession] Billing computation failed:`, error);
      billingData.billingStatus = 'BILLING_ERROR';
    }
  }

  // Update session
  const updatedSession = await prisma.chargingSession.update({
    where: { id: sessionId },
    data: {
      endTime,
      durationSeconds,
      energyKwh,
      status: 'COMPLETED',
      stopReason: stopReason || 'OTHER',
      ...billingData,
      // Store CDR data
      roamingGrossAmount: cdrData.grossAmount,
      roamingNetAmount: cdrData.netAmount,
      clearingStatus: 'PENDING',
    },
  });

  // Capture payment (Stripe)
  if (updatedSession.billingStatus === 'BILLED' && updatedSession.stripePaymentIntentId) {
    try {
      const captureResult = await paymentApi.capturePayment({
        sessionId: sessionId,
        amountEur: updatedSession.grossAmount,
      });

      if (captureResult.error) {
        console.warn(`[closeOutboundSession] Payment capture failed: ${captureResult.error}`);
        await prisma.chargingSession.update({
          where: { id: sessionId },
          data: {
            paymentStatus: 'FAILED',
            paymentLastErrorMessage: captureResult.error,
          },
        });
      } else {
        await prisma.chargingSession.update({
          where: { id: sessionId },
          data: {
            paymentStatus: 'CAPTURED',
            capturedAmountCents: captureResult.amountCents,
            paidAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`[closeOutboundSession] Payment capture error:`, error);
    }
  }

  return updatedSession;
}

/**
 * Match CDR with existing session
 * @param {string} hubjectSessionId - Hubject session ID
 * @param {object} cdrData - CDR data from Hubject
 * @returns {Promise<object>} Matching result
 */
async function matchCdrWithSession(hubjectSessionId, cdrData) {
  // Find session by hubjectSessionId
  const session = await prisma.chargingSession.findUnique({
    where: { hubjectSessionId },
  });

  if (!session) {
    throw new Error(`Session with hubjectSessionId ${hubjectSessionId} not found`);
  }

  // Verify CDR match using clearing service
  const { verifyCdrMatch } = require('./clearing');
  const { reconcileSettlement } = require('./clearing');
  const matchResult = verifyCdrMatch(session, cdrData);

  // If match OK, reconcile settlement
  if (matchResult.match) {
    const settlement = await reconcileSettlement(session.id, {
      hubjectSessionId,
      cdrData,
      clearingReference: cdrData.clearingReference || `CDR-${hubjectSessionId}`,
      settledAt: new Date(),
    });

    return {
      matched: true,
      session: settlement.session,
      matchResult: settlement.matchResult,
      clearingAmounts: settlement.clearingAmounts,
    };
  } else {
    // Mismatch: mark as DISPUTED
    const updatedSession = await prisma.chargingSession.update({
      where: { id: session.id },
      data: {
        clearingStatus: 'DISPUTED',
        clearingDisputeReason: `CDR mismatch: ${matchResult.mismatches.join('; ')}`,
        roamingGrossAmount: cdrData.grossAmount,
        roamingNetAmount: cdrData.netAmount,
      },
    });

    return {
      matched: false,
      session: updatedSession,
      matchResult,
      disputeReason: matchResult.mismatches.join('; '),
    };
  }
}

module.exports = {
  createInboundSession,
  closeInboundSession,
  createOutboundSession,
  closeOutboundSession,
  matchCdrWithSession,
};
