/**
 * Operations Alerting Service
 * Handles alert generation, deduplication, and management
 * 
 * IMPORTANT:
 * - Alerts are deduplicated to prevent spam
 * - Only actionable alerts are generated
 * - Alerts are linked to resources via correlationId
 */

import prisma from '@/prisma/index';
import crypto from 'crypto';

/**
 * Generate deduplication key for alert
 * @param {string} alertType - Alert type
 * @param {string} resourceId - Resource ID (station, session, etc.)
 * @param {object} context - Additional context
 * @returns {string} Deduplication key
 */
function generateDedupeKey(alertType, resourceId, context = {}) {
  const contextHash = crypto
    .createHash('md5')
    .update(JSON.stringify(context))
    .digest('hex')
    .substring(0, 8);
  
  return `${alertType}:${resourceId || 'global'}:${contextHash}`;
}

/**
 * Create or update alert (with deduplication)
 * @param {object} params
 * @param {string} params.alertType - Alert type
 * @param {string} params.severity - INFO | WARN | CRITICAL
 * @param {string} params.title - Alert title
 * @param {string} params.message - Alert message
 * @param {object} params.context - Additional context (JSON)
 * @param {string} params.resourceId - Resource ID
 * @param {string} params.resourceType - Resource type (STATION | SESSION | PAYMENT | etc.)
 * @param {string} params.correlationId - Correlation ID for event linking
 * @returns {Promise<object>} Alert (created or updated)
 */
export async function createOrUpdateAlert({
  alertType,
  severity = 'WARN',
  title,
  message,
  context = {},
  resourceId = null,
  resourceType = null,
  correlationId = null,
}) {
  const dedupeKey = generateDedupeKey(alertType, resourceId, context);

  // Check if alert already exists
  const existing = await prisma.opsAlert.findUnique({
    where: { dedupeKey },
  });

  if (existing) {
    // Update existing alert (update lastSeenAt, keep status if ACK or RESOLVED)
    const updateData = {
      lastSeenAt: new Date(),
      message, // Update message in case context changed
      context,
    };

    // Only update status if it's OPEN (don't override ACK or RESOLVED)
    if (existing.status === 'OPEN') {
      updateData.severity = severity; // Update severity if changed
    }

    return await prisma.opsAlert.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  // Create new alert
  return await prisma.opsAlert.create({
    data: {
      alertType,
      severity,
      status: 'OPEN',
      title,
      message,
      context,
      resourceId,
      resourceType,
      correlationId,
      dedupeKey,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Get alerts with filters
 * @param {object} params
 * @param {string} params.status - Filter by status (OPEN | ACK | RESOLVED)
 * @param {string} params.severity - Filter by severity (INFO | WARN | CRITICAL)
 * @param {string} params.resourceType - Filter by resource type
 * @param {string} params.workspaceId - Filter by workspace (via resourceId)
 * @param {number} params.page - Page number
 * @param {number} params.pageSize - Page size
 * @returns {Promise<object>} { data, pagination }
 */
export async function getAlerts({
  status = null,
  severity = null,
  resourceType = null,
  workspaceId = null,
  page = 1,
  pageSize = 20,
}) {
  const skip = (page - 1) * pageSize;

  const where = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (resourceType) where.resourceType = resourceType;

  // If workspaceId provided, we need to join with resources
  // For now, we'll filter by resourceId pattern (workspaceId is usually in resourceId)
  // TODO: Improve this with proper joins

  const [data, total] = await Promise.all([
    prisma.opsAlert.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { severity: 'desc' }, // CRITICAL first
        { firstSeenAt: 'desc' }, // Newest first
      ],
    }),
    prisma.opsAlert.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Acknowledge alert
 * @param {string} alertId - Alert ID
 * @param {string} userId - User ID acknowledging
 * @param {string} userEmail - User email
 * @returns {Promise<object>} Updated alert
 */
export async function acknowledgeAlert(alertId, userId, userEmail) {
  return await prisma.opsAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACK',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    },
  });
}

/**
 * Resolve alert
 * @param {string} alertId - Alert ID
 * @param {string} userId - User ID resolving
 * @param {string} userEmail - User email
 * @returns {Promise<object>} Updated alert
 */
export async function resolveAlert(alertId, userId, userEmail) {
  return await prisma.opsAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });
}

/**
 * Get alert statistics
 * @returns {Promise<object>} Alert statistics
 */
export async function getAlertStats() {
  try {
    // #region agent log - debug alert stats
    console.log('[DEBUG] getAlertStats called', { timestamp: Date.now() });
    // #endregion

    const [total, open, critical, bySeverity, byStatus] = await Promise.all([
      prisma.opsAlert.count().catch(() => 0),
      prisma.opsAlert.count({ where: { status: 'OPEN' } }).catch(() => 0),
      prisma.opsAlert.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }).catch(() => 0),
      prisma.opsAlert.groupBy({
        by: ['severity'],
        where: { status: 'OPEN' },
        _count: true,
      }).catch(() => []),
      prisma.opsAlert.groupBy({
        by: ['status'],
        _count: true,
      }).catch(() => []),
    ]);

  return {
    total,
    open,
    critical,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {}),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),
  };
  } catch (error) {
    // #region agent log - debug error
    console.error('[DEBUG] getAlertStats error:', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
    // #endregion
    // Return empty stats on error (table might not exist yet)
    return {
      total: 0,
      open: 0,
      critical: 0,
      bySeverity: {},
      byStatus: {},
    };
  }
}
