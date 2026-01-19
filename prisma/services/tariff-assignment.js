import prisma from '@/prisma/index';

/**
 * Get tariff assignments for a station
 */
export const getStationTariffAssignments = async (workspaceId, stationId) => {
  const assignments = await prisma.tariffAssignment.findMany({
    where: {
      stationId,
      tariff: {
        workspaceId,
        deletedAt: null,
      },
    },
    include: {
      tariff: {
        select: {
          id: true,
          name: true,
          basePricePerKwh: true,
          pricePerMinute: true,
          sessionStartFee: true,
          currency: true,
          msFeePercent: true,
          isActive: true,
        },
      },
      connector: {
        select: {
          id: true,
          connectorId: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return assignments;
};

/**
 * Assign tariff to station
 */
export const assignTariffToStation = async (workspaceId, stationId, tariffId, { validFrom, validUntil }) => {
  // Verify tariff exists and belongs to workspace
  const tariff = await prisma.tariffProfile.findFirst({
    where: {
      id: tariffId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!tariff) {
    throw new Error('Tariff profile not found');
  }

  // Verify station exists and belongs to workspace
  const station = await prisma.chargingStation.findFirst({
    where: {
      id: stationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!station) {
    throw new Error('Station not found');
  }

  // Validate dates
  if (validUntil && validFrom && new Date(validUntil) < new Date(validFrom)) {
    throw new Error('validUntil must be after validFrom');
  }

  const assignment = await prisma.tariffAssignment.create({
    data: {
      tariffId,
      stationId,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
    },
    include: {
      tariff: true,
      station: {
        select: { id: true, name: true, ocppId: true },
      },
    },
  });

  return assignment;
};

/**
 * Assign tariff to connector
 */
export const assignTariffToConnector = async (workspaceId, connectorId, tariffId, { validFrom, validUntil }) => {
  // Verify tariff exists and belongs to workspace
  const tariff = await prisma.tariffProfile.findFirst({
    where: {
      id: tariffId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!tariff) {
    throw new Error('Tariff profile not found');
  }

  // Verify connector exists and belongs to workspace (via station)
  const connector = await prisma.connector.findFirst({
    where: {
      id: connectorId,
      station: {
        workspaceId,
        deletedAt: null,
      },
    },
    include: {
      station: {
        select: { id: true, workspaceId: true },
      },
    },
  });

  if (!connector) {
    throw new Error('Connector not found');
  }

  // Validate dates
  if (validUntil && validFrom && new Date(validUntil) < new Date(validFrom)) {
    throw new Error('validUntil must be after validFrom');
  }

  const assignment = await prisma.tariffAssignment.create({
    data: {
      tariffId,
      connectorId,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
    },
    include: {
      tariff: true,
      connector: {
        select: { id: true, connectorId: true, name: true },
      },
    },
  });

  return assignment;
};

/**
 * Resolve active tariff for station/connector at a given time
 * Priority: connector > station
 * @param {string} workspaceId - Workspace ID
 * @param {string} stationId - Station ID
 * @param {string} connectorId - Connector ID (optional)
 * @param {Date} atTime - Time to resolve tariff (default: now)
 * @returns {Promise<object|null>} TariffProfile or null
 */
export const resolveActiveTariff = async (workspaceId, stationId, connectorId = null, atTime = new Date()) => {
  const time = atTime instanceof Date ? atTime : new Date(atTime);

  // Try connector assignment first (highest priority)
  if (connectorId) {
    const connectorAssignment = await prisma.tariffAssignment.findFirst({
      where: {
        connectorId,
        tariff: {
          workspaceId,
          deletedAt: null,
          isActive: true,
        },
        validFrom: { lte: time },
        OR: [
          { validUntil: null },
          { validUntil: { gte: time } },
        ],
      },
      include: {
        tariff: true,
      },
      orderBy: { validFrom: 'desc' }, // Most recent valid assignment
    });

    if (connectorAssignment && connectorAssignment.tariff) {
      return connectorAssignment.tariff;
    }
  }

  // Fallback to station assignment
  const stationAssignment = await prisma.tariffAssignment.findFirst({
    where: {
      stationId,
      connectorId: null, // Station-level assignment (no connector)
      tariff: {
        workspaceId,
        deletedAt: null,
        isActive: true,
      },
      validFrom: { lte: time },
      OR: [
        { validUntil: null },
        { validUntil: { gte: time } },
      ],
    },
    include: {
      tariff: true,
    },
    orderBy: { validFrom: 'desc' }, // Most recent valid assignment
  });

  if (stationAssignment && stationAssignment.tariff) {
    return stationAssignment.tariff;
  }

  // No active tariff found
  return null;
};

/**
 * Delete tariff assignment
 */
export const deleteTariffAssignment = async (workspaceId, assignmentId) => {
  // Verify assignment exists and belongs to workspace (via tariff)
  const assignment = await prisma.tariffAssignment.findFirst({
    where: {
      id: assignmentId,
      tariff: {
        workspaceId,
        deletedAt: null,
      },
    },
  });

  if (!assignment) {
    throw new Error('Tariff assignment not found');
  }

  await prisma.tariffAssignment.delete({
    where: { id: assignmentId },
  });

  return { success: true };
};
