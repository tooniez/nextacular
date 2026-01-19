/**
 * Operations Monitoring Service
 * Provides KPI and health checks for operations dashboard
 * 
 * IMPORTANT:
 * - KPI are calculated in real-time or near real-time
 * - Performance optimized with indexes
 * - Caching recommended for production
 */

import prisma from '@/prisma/index';

/**
 * Get station health statistics
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} Station health stats
 */
export async function getStationHealthStats(workspaceId = null) {
  try {
    // #region agent log - debug function call
    console.log('[DEBUG] getStationHealthStats called', {
      workspaceId,
      timestamp: Date.now(),
    });
    // #endregion

    const where = workspaceId ? { workspaceId, deletedAt: null } : { deletedAt: null };

    const stations = await prisma.chargingStation.findMany({
      where,
      select: {
        id: true,
        status: true,
        lastHeartbeat: true,
      },
    });

    // #region agent log - debug stations retrieved
    console.log('[DEBUG] Stations retrieved', {
      count: stations.length,
      timestamp: Date.now(),
    });
    // #endregion

  const now = new Date();
  const HEARTBEAT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const HEARTBEAT_DEGRADED_MS = 5 * 60 * 1000; // 5 minutes

  let online = 0;
  let offline = 0;
  let degraded = 0;
  let faulted = 0;
  let other = 0;

  stations.forEach((station) => {
    if (station.status === 'FAULTED') {
      faulted++;
    } else if (station.status === 'OFFLINE') {
      offline++;
    } else if (!station.lastHeartbeat) {
      offline++;
    } else {
      const timeSinceHeartbeat = now - new Date(station.lastHeartbeat);
      
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        offline++;
      } else if (timeSinceHeartbeat > HEARTBEAT_DEGRADED_MS) {
        degraded++;
      } else {
        online++;
      }
    }
  });

  const total = stations.length;

  return {
    total,
    online,
    offline,
    degraded,
    faulted,
    other,
    onlinePercent: total > 0 ? (online / total) * 100 : 0,
    offlinePercent: total > 0 ? (offline / total) * 100 : 0,
    degradedPercent: total > 0 ? (degraded / total) * 100 : 0,
    faultedPercent: total > 0 ? (faulted / total) * 100 : 0,
  };
  } catch (error) {
    // #region agent log - debug error
    console.error('[DEBUG] getStationHealthStats error:', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
    // #endregion
    throw error;
  }
}

/**
 * Get connector health statistics
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} Connector health stats
 */
export async function getConnectorHealthStats(workspaceId = null) {
  const where = workspaceId
    ? { station: { workspaceId, deletedAt: null } }
    : { station: { deletedAt: null } };

  const connectors = await prisma.connector.findMany({
    where,
    select: {
      id: true,
      status: true,
    },
  });

  const stats = {
    total: connectors.length,
    available: 0,
    charging: 0,
    faulted: 0,
    other: 0,
  };

  connectors.forEach((connector) => {
    if (connector.status === 'AVAILABLE') {
      stats.available++;
    } else if (connector.status === 'OCCUPIED') {
      stats.charging++;
    } else if (connector.status === 'FAULTED') {
      stats.faulted++;
    } else {
      stats.other++;
    }
  });

  return {
    ...stats,
    availablePercent: stats.total > 0 ? (stats.available / stats.total) * 100 : 0,
    chargingPercent: stats.total > 0 ? (stats.charging / stats.total) * 100 : 0,
    faultedPercent: stats.total > 0 ? (stats.faulted / stats.total) * 100 : 0,
  };
}

/**
 * Get active sessions count
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<number>} Active sessions count
 */
export async function getActiveSessionsCount(workspaceId = null) {
  const where = {
    status: 'ACTIVE',
    ...(workspaceId && { workspaceId }),
  };

  return await prisma.chargingSession.count({ where });
}

/**
 * Get pending stop sessions (sessions without StopTransaction for > X minutes)
 * @param {string} workspaceId - Optional workspace filter
 * @param {number} minutesThreshold - Minutes threshold (default: 30)
 * @returns {Promise<number>} Pending stop sessions count
 */
export async function getPendingStopSessionsCount(workspaceId = null, minutesThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold);

  const where = {
    status: 'ACTIVE',
    endTime: null,
    startTime: { lt: thresholdDate },
    ...(workspaceId && { workspaceId }),
  };

  return await prisma.chargingSession.count({ where });
}

/**
 * Get payment failure statistics (last 24 hours)
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} Payment failure stats
 */
export async function getPaymentFailureStats(workspaceId = null) {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  const where = {
    createdAt: { gte: last24h },
    ...(workspaceId && { workspaceId }),
  };

  const [total, holdFailed, captureFailed] = await Promise.all([
    prisma.chargingSession.count({
      where: {
        ...where,
        paymentStatus: { not: 'NONE' },
      },
    }),
    prisma.chargingSession.count({
      where: {
        ...where,
        paymentStatus: 'FAILED',
        paymentLastErrorCode: { contains: 'hold' },
      },
    }),
    prisma.chargingSession.count({
      where: {
        ...where,
        paymentStatus: 'FAILED',
        paymentLastErrorCode: { contains: 'capture' },
      },
    }),
  ]);

  return {
    total,
    holdFailed,
    captureFailed,
    holdFailedRate: total > 0 ? (holdFailed / total) * 100 : 0,
    captureFailedRate: total > 0 ? (captureFailed / total) * 100 : 0,
    totalFailures: holdFailed + captureFailed,
  };
}

/**
 * Get roaming clearing statistics
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} Roaming clearing stats
 */
export async function getRoamingClearingStats(workspaceId = null) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const where = {
    roamingType: { not: 'NONE' },
    startTime: { gte: last30Days },
    ...(workspaceId && { workspaceId }),
  };

  const [total, pending, settled, disputed] = await Promise.all([
    prisma.chargingSession.count({ where }),
    prisma.chargingSession.count({
      where: {
        ...where,
        clearingStatus: 'PENDING',
      },
    }),
    prisma.chargingSession.count({
      where: {
        ...where,
        clearingStatus: 'SETTLED',
      },
    }),
    prisma.chargingSession.count({
      where: {
        ...where,
        clearingStatus: 'DISPUTED',
      },
    }),
  ]);

  // Count pending > 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const pendingOld = await prisma.chargingSession.count({
    where: {
      ...where,
      clearingStatus: 'PENDING',
      startTime: { lt: sevenDaysAgo },
    },
  });

  return {
    total,
    pending,
    settled,
    disputed,
    pendingOld, // > 7 days
    settledRate: total > 0 ? (settled / total) * 100 : 0,
    disputeRate: total > 0 ? (disputed / total) * 100 : 0,
  };
}

/**
 * Get OCPP error statistics (last 24 hours)
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} OCPP error stats
 */
export async function getOCPPErrorStats(workspaceId = null) {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  // This would require joining with OcppMessage table
  // For now, return placeholder structure
  // TODO: Implement with proper OCPP message analysis
  
  return {
    totalMessages: 0,
    errors: 0,
    retries: 0,
    errorRate: 0,
    retryRate: 0,
    byVendor: {},
  };
}

/**
 * Get operations dashboard KPI (all metrics)
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<object>} Complete operations KPI
 */
export async function getOperationsDashboardKPI(workspaceId = null) {
  try {
    // #region agent log - debug KPI call
    console.log('[DEBUG] getOperationsDashboardKPI called', {
      workspaceId,
      timestamp: Date.now(),
    });
    // #endregion

    const [
      stationStats,
      connectorStats,
      activeSessions,
      pendingStopSessions,
      paymentStats,
      roamingStats,
      ocppStats,
    ] = await Promise.all([
      getStationHealthStats(workspaceId).catch((e) => {
        console.error('[DEBUG] getStationHealthStats error:', e.message);
        return { total: 0, online: 0, offline: 0, degraded: 0, faulted: 0, other: 0, onlinePercent: 0, offlinePercent: 0, degradedPercent: 0, faultedPercent: 0 };
      }),
      getConnectorHealthStats(workspaceId).catch((e) => {
        console.error('[DEBUG] getConnectorHealthStats error:', e.message);
        return { total: 0, available: 0, charging: 0, faulted: 0, other: 0, availablePercent: 0, chargingPercent: 0, faultedPercent: 0 };
      }),
      getActiveSessionsCount(workspaceId).catch((e) => {
        console.error('[DEBUG] getActiveSessionsCount error:', e.message);
        return 0;
      }),
      getPendingStopSessionsCount(workspaceId).catch((e) => {
        console.error('[DEBUG] getPendingStopSessionsCount error:', e.message);
        return 0;
      }),
      getPaymentFailureStats(workspaceId).catch((e) => {
        console.error('[DEBUG] getPaymentFailureStats error:', e.message);
        return { total: 0, holdFailed: 0, captureFailed: 0, holdFailedRate: 0, captureFailedRate: 0, totalFailures: 0 };
      }),
      getRoamingClearingStats(workspaceId).catch((e) => {
        console.error('[DEBUG] getRoamingClearingStats error:', e.message);
        return { total: 0, pending: 0, settled: 0, disputed: 0, pendingOld: 0, settledRate: 0, disputeRate: 0 };
      }),
      getOCPPErrorStats(workspaceId).catch((e) => {
        console.error('[DEBUG] getOCPPErrorStats error:', e.message);
        return { totalMessages: 0, errors: 0, retries: 0, errorRate: 0, retryRate: 0, byVendor: {} };
      }),
    ]);

  return {
    stations: stationStats,
    connectors: connectorStats,
    sessions: {
      active: activeSessions,
      pendingStop: pendingStopSessions,
    },
    payments: paymentStats,
    roaming: roamingStats,
    ocpp: ocppStats,
    timestamp: new Date(),
  };
  } catch (error) {
    // #region agent log - debug error
    console.error('[DEBUG] getOperationsDashboardKPI error:', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
    // #endregion
    // Return empty KPI structure on error
    return {
      stations: { total: 0, online: 0, offline: 0, degraded: 0, faulted: 0, other: 0, onlinePercent: 0, offlinePercent: 0, degradedPercent: 0, faultedPercent: 0 },
      connectors: { total: 0, available: 0, charging: 0, faulted: 0, other: 0, availablePercent: 0, chargingPercent: 0, faultedPercent: 0 },
      sessions: { active: 0, pendingStop: 0 },
      payments: { total: 0, holdFailed: 0, captureFailed: 0, holdFailedRate: 0, captureFailedRate: 0, totalFailures: 0 },
      roaming: { total: 0, pending: 0, settled: 0, disputed: 0, pendingOld: 0, settledRate: 0, disputeRate: 0 },
      ocpp: { totalMessages: 0, errors: 0, retries: 0, errorRate: 0, retryRate: 0, byVendor: {} },
      timestamp: new Date(),
    };
  }
}
