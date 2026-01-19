import prisma from '@/prisma/index';

/**
 * Get all tariff profiles for a workspace (with filters, pagination)
 */
export const getTariffProfiles = async (
  workspaceId,
  { search, isActive, page = 1, pageSize = 20 }
) => {
  const where = {
    workspaceId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(isActive !== undefined && { isActive }),
  };

  const [tariffs, total] = await Promise.all([
    prisma.tariffProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tariffProfile.count({ where }),
  ]);

  return {
    tariffs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * Get tariff profile by ID (workspace-scoped)
 */
export const getTariffProfile = async (workspaceId, tariffId) => {
  const tariff = await prisma.tariffProfile.findFirst({
    where: {
      id: tariffId,
      workspaceId,
      deletedAt: null,
    },
    include: {
      assignments: {
        include: {
          station: {
            select: { id: true, name: true, ocppId: true },
          },
          connector: {
            select: { id: true, connectorId: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!tariff) {
    throw new Error('Tariff profile not found');
  }

  return tariff;
};

/**
 * Create tariff profile
 */
export const createTariffProfile = async (workspaceId, data) => {
  const {
    name,
    basePricePerKwh,
    pricePerMinute = 0,
    sessionStartFee = 0,
    currency = 'EUR',
    msFeePercent,
    isActive = true,
    validFrom,
    validUntil,
  } = data;

  // Validate msFeePercent (0-1 range, e.g., 0.15 = 15%)
  if (msFeePercent < 0 || msFeePercent > 1) {
    throw new Error('msFeePercent must be between 0 and 1');
  }

  const tariff = await prisma.tariffProfile.create({
    data: {
      workspaceId,
      name,
      basePricePerKwh: parseFloat(basePricePerKwh),
      pricePerMinute: pricePerMinute ? parseFloat(pricePerMinute) : 0,
      sessionStartFee: sessionStartFee ? parseFloat(sessionStartFee) : 0,
      currency,
      msFeePercent: parseFloat(msFeePercent),
      isActive,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
    },
  });

  return tariff;
};

/**
 * Update tariff profile
 */
export const updateTariffProfile = async (workspaceId, tariffId, data) => {
  // Verify tariff exists and belongs to workspace
  await getTariffProfile(workspaceId, tariffId);

  const {
    name,
    basePricePerKwh,
    pricePerMinute,
    sessionStartFee,
    currency,
    msFeePercent,
    isActive,
    validFrom,
    validUntil,
  } = data;

  // Validate msFeePercent if provided
  if (msFeePercent !== undefined && (msFeePercent < 0 || msFeePercent > 1)) {
    throw new Error('msFeePercent must be between 0 and 1');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (basePricePerKwh !== undefined) updateData.basePricePerKwh = parseFloat(basePricePerKwh);
  if (pricePerMinute !== undefined) updateData.pricePerMinute = pricePerMinute ? parseFloat(pricePerMinute) : 0;
  if (sessionStartFee !== undefined) updateData.sessionStartFee = sessionStartFee ? parseFloat(sessionStartFee) : 0;
  if (currency !== undefined) updateData.currency = currency;
  if (msFeePercent !== undefined) updateData.msFeePercent = parseFloat(msFeePercent);
  if (isActive !== undefined) updateData.isActive = isActive;
  if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
  if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;

  const tariff = await prisma.tariffProfile.update({
    where: { id: tariffId },
    data: updateData,
  });

  return tariff;
};

/**
 * Delete tariff profile (soft delete)
 */
export const deleteTariffProfile = async (workspaceId, tariffId) => {
  // Verify tariff exists and belongs to workspace
  await getTariffProfile(workspaceId, tariffId);

  const tariff = await prisma.tariffProfile.update({
    where: { id: tariffId },
    data: { deletedAt: new Date() },
  });

  return tariff;
};
