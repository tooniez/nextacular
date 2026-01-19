/**
 * Billing Engine (Next.js API routes)
 * Duplicate of apps/ocpp/services/billing.js for use in Next.js API routes
 * This ensures consistency between OCPP server and Next.js API
 */

/**
 * Round to 2 decimal places (EUR cents)
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
function roundToCents(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Compute session amounts from energy, duration, and tariff snapshot
 * @param {object} params - Session parameters
 * @param {number} params.energyKwh - Energy delivered in kWh
 * @param {number} params.durationSeconds - Session duration in seconds
 * @param {number} params.idleSeconds - Idle time in seconds (optional, default 0)
 * @param {object} params.snapshot - Tariff snapshot object
 * @param {number} params.snapshot.basePricePerKwh - Price per kWh
 * @param {number} params.snapshot.pricePerMinute - Price per minute (optional)
 * @param {number} params.snapshot.sessionStartFee - Session start fee (optional)
 * @param {number} params.snapshot.idleFeePerMinute - Idle fee per minute (optional)
 * @param {number} params.snapshot.msFeePercent - MSolution fee percentage (0-100)
 * @param {string} params.snapshot.currency - Currency code (default: EUR)
 * @returns {object} Billing breakdown
 */
export function computeSessionAmounts({ energyKwh, durationSeconds, idleSeconds = 0, snapshot }) {
  const {
    basePricePerKwh = 0,
    pricePerMinute = 0,
    sessionStartFee = 0,
    idleFeePerMinute = 0,
    msFeePercent = 0,
    currency = 'EUR',
  } = snapshot || {};

  // Calculate component amounts
  const energyAmount = roundToCents(energyKwh * basePricePerKwh);
  const durationMinutes = durationSeconds / 60;
  const timeAmount = roundToCents(durationMinutes * pricePerMinute);
  const sessionStartFeeAmount = roundToCents(sessionStartFee);
  const idleMinutes = idleSeconds / 60;
  const idleAmount = roundToCents(idleMinutes * idleFeePerMinute);

  // Calculate subtotal (sum of all components)
  const subtotal = roundToCents(
    energyAmount + timeAmount + sessionStartFeeAmount + idleAmount
  );

  // Calculate gross amount (same as subtotal for now, but could include other fees)
  const grossAmount = subtotal;

  // Calculate MS fee and Sub-CPO earning
  // msFeePercent is 0-100, so divide by 100
  const msFeeAmount = roundToCents(grossAmount * (msFeePercent / 100));
  const subCpoEarningAmount = roundToCents(grossAmount - msFeeAmount);

  return {
    currency,
    components: {
      energyAmount,
      timeAmount,
      sessionStartFeeAmount,
      idleAmount,
      subtotal,
    },
    grossAmount,
    msFeePercent,
    msFeeAmount,
    subCpoEarningAmount,
  };
}

/**
 * Create billing breakdown JSON for storage
 * @param {object} billing - Result from computeSessionAmounts
 * @param {object} sessionInfo - Additional session info
 * @returns {string} JSON string
 */
export function createBillingBreakdownJson(billing, sessionInfo = {}) {
  const breakdown = {
    ...billing,
    computedAt: new Date().toISOString(),
    sessionId: sessionInfo.id,
    sessionStatus: sessionInfo.status,
  };
  return JSON.stringify(breakdown);
}

export { roundToCents };
