import prisma from '@/prisma/index';

/**
 * Get sessions for a workspace with filters and pagination
 * @param {string} workspaceId - Workspace ID
 * @param {object} filters - Filter options
 * @param {string} filters.status - Session status filter
 * @param {string} filters.stationId - Station ID filter
 * @param {string} filters.from - Start date (ISO string)
 * @param {string} filters.to - End date (ISO string)
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.pageSize - Page size (default: 20)
 * @returns {Promise<object>} Paginated sessions
 */
export async function getSessions(workspaceId, filters = {}) {
  const {
    status = null,
    stationId = null,
    from = null,
    to = null,
    page = 1,
    pageSize = 20,
  } = filters;

  // Build where clause
  const where = {
    workspaceId,
    // Note: ChargingSession model does not have deletedAt field, so we don't filter by it
  };

  if (status) {
    where.status = status;
  }

  if (stationId) {
    where.stationId = stationId;
  }

  if (from || to) {
    where.startTime = {};
    if (from) {
      where.startTime.gte = new Date(from);
    }
    if (to) {
      where.startTime.lte = new Date(to);
    }
  }

  // Get total count
  let total;
  try {
    total = await prisma.chargingSession.count({ where });
  } catch (error) {
    // Fallback: return 0 if count fails
    total = 0;
  }

  // Get paginated sessions
  const skip = (page - 1) * pageSize;
  // Optimize: Use select instead of include to reduce payload
  const sessions = await prisma.chargingSession.findMany({
    where,
    select: {
      id: true,
      ocppTransactionId: true,
      status: true,
      startTime: true,
      endTime: true, // Fixed: use endTime instead of stopTime
      energyKwh: true,
      durationSeconds: true,
      grossAmount: true,
      msFeeAmount: true,
      subCpoEarningAmount: true,
      currency: true,
      billingStatus: true,
      station: {
        select: {
          id: true,
          name: true,
          ocppId: true, // Fixed: use ocppId instead of ocppIdentity
        },
      },
      connector: {
        select: {
          id: true,
          connectorId: true,
          connectorType: true,
        },
      },
      endUser: {
        select: {
          id: true,
          email: true,
          name: true, // Fixed: EndUser has 'name', not 'firstName'/'lastName'
        },
      },
    },
    orderBy: { startTime: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    data: sessions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @param {string} workspaceId - Workspace ID (for security)
 * @returns {Promise<object|null>} Session or null
 */
export async function getSession(sessionId, workspaceId) {
  const session = await prisma.chargingSession.findFirst({
    where: {
      id: sessionId,
      workspaceId,
      // Note: ChargingSession model does not have deletedAt field
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          ocppId: true,
          location: true,
        },
      },
      connector: {
        select: {
          id: true,
          connectorId: true,
          connectorType: true,
          maxPower: true,
        },
      },
      endUser: {
        select: {
          id: true,
          email: true,
          name: true, // Fixed: EndUser has 'name', not 'firstName'/'lastName'
          rfidToken: true,
        },
      },
      tariffSnapshot: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
    },
  });

  return session;
}
