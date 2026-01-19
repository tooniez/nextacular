import { StationStatus, InvitationStatus } from '@prisma/client';
import prisma from '@/prisma/index';

/**
 * Get all stations for a workspace (with filters, pagination)
 */
export const getStations = async (
  workspaceId,
  { search, status, city, page = 1, pageSize = 20 }
) => {
  const where = {
    workspaceId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { ocppId: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
    ...(city && { location: { contains: city, mode: 'insensitive' } }),
  };

  // Optimize: Use select instead of include to reduce payload
  const [stations, total] = await Promise.all([
    prisma.chargingStation.findMany({
      where,
      select: {
        id: true,
        name: true,
        ocppId: true,
        status: true,
        location: true,
        lastHeartbeat: true,
        createdAt: true,
        updatedAt: true,
        connectors: {
          select: {
            id: true,
            connectorId: true,
            connectorType: true,
            status: true,
            maxPower: true,
          },
          orderBy: { connectorId: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chargingStation.count({ where }),
  ]);

  return {
    data: stations.map((station) => ({
      ...station,
      connectorsCount: station.connectors?.length || 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * Get station by ID (workspace-scoped)
 */
export const getStation = async (workspaceId, stationId) => {
  const station = await prisma.chargingStation.findFirst({
    where: {
      id: stationId,
      workspaceId,
      deletedAt: null,
    },
    include: {
      connectors: {
        // Connector model doesn't have deletedAt field
        orderBy: { connectorId: 'asc' },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          brandLogoUrl: true,
          contactWebsiteUrl: true,
          contactEmail: true,
          contactPhone: true,
        },
      },
    },
  });

  if (!station) {
    throw new Error('Station not found');
  }

  return station;
};

/**
 * Create station
 */
export const createStation = async (
  workspaceId,
  { ocppId, name, location, latitude, longitude, ocppVersion }
) => {
  // Check if ocppId already exists for this workspace
  const existing = await prisma.chargingStation.findFirst({
    where: {
      workspaceId,
      ocppId,
      deletedAt: null,
    },
  });

  if (existing) {
    throw new Error('Station with this OCPP ID already exists');
  }

  const station = await prisma.chargingStation.create({
    data: {
      workspaceId,
      ocppId,
      name,
      location,
      latitude,
      longitude,
      status: StationStatus.OFFLINE,
      ocppVersion,
    },
    include: {
      connectors: true,
    },
  });

  return station;
};

/**
 * Update station
 */
export const updateStation = async (
  workspaceId,
  stationId,
  { name, location, latitude, longitude, status, ocppVersion }
) => {
  // Verify station exists and belongs to workspace
  const existing = await getStation(workspaceId, stationId);

  const station = await prisma.chargingStation.update({
    where: { id: stationId },
    data: {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(status !== undefined && { status }),
      ...(ocppVersion !== undefined && { ocppVersion }),
    },
    include: {
      connectors: {
        orderBy: { connectorId: 'asc' },
      },
    },
  });

  return station;
};

/**
 * Delete station (soft delete)
 */
export const deleteStation = async (workspaceId, stationId) => {
  // Verify station exists and belongs to workspace
  await getStation(workspaceId, stationId);

  const station = await prisma.chargingStation.update({
    where: { id: stationId },
    data: { deletedAt: new Date() },
  });

  return station;
};

/**
 * Get workspace member role for authorization
 */
export const getWorkspaceMemberRole = async (workspaceId, userEmail) => {
  const member = await prisma.member.findFirst({
    where: {
      workspaceId,
      email: userEmail,
      deletedAt: null,
      status: InvitationStatus.ACCEPTED,
    },
    select: {
      teamRole: true,
    },
  });

  return member?.teamRole || null;
};
