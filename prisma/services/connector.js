import { ConnectorStatus } from '@prisma/client';
import prisma from '@/prisma/index';
import { getStation } from './station';

/**
 * Get all connectors for a station
 */
export const getConnectors = async (workspaceId, stationId) => {
  // Verify station belongs to workspace
  await getStation(workspaceId, stationId);

  const connectors = await prisma.connector.findMany({
    where: {
      stationId,
    },
    orderBy: { connectorId: 'asc' },
  });

  return connectors;
};

/**
 * Get connector by ID
 */
export const getConnector = async (workspaceId, connectorId) => {
  const connector = await prisma.connector.findFirst({
    where: {
      id: connectorId,
      deletedAt: null,
      station: {
        workspaceId,
        deletedAt: null,
      },
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
        },
      },
    },
  });

  if (!connector) {
    throw new Error('Connector not found');
  }

  return connector;
};

/**
 * Create connector
 */
export const createConnector = async (
  workspaceId,
  stationId,
  { connectorId: connectorIdInput, name, maxPower, connectorType }
) => {
  // Verify station belongs to workspace
  await getStation(workspaceId, stationId);

  // Check if connectorId already exists for this station
  const existing = await prisma.connector.findFirst({
    where: {
      stationId,
      connectorId: connectorIdInput,
    },
  });

  if (existing) {
    throw new Error('Connector with this ID already exists for this station');
  }

  const connector = await prisma.connector.create({
    data: {
      stationId,
      connectorId: connectorIdInput,
      name,
      status: ConnectorStatus.AVAILABLE,
      maxPower,
      connectorType,
    },
  });

  return connector;
};

/**
 * Update connector
 */
export const updateConnector = async (
  workspaceId,
  connectorId,
  { name, status, maxPower, connectorType }
) => {
  // Verify connector belongs to workspace
  const existing = await getConnector(workspaceId, connectorId);

  const connector = await prisma.connector.update({
    where: { id: connectorId },
    data: {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
      ...(maxPower !== undefined && { maxPower }),
      ...(connectorType !== undefined && { connectorType }),
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return connector;
};

/**
 * Delete connector (hard delete - Connector model doesn't have deletedAt)
 */
export const deleteConnector = async (workspaceId, connectorId) => {
  // Verify connector belongs to workspace
  await getConnector(workspaceId, connectorId);

  // Note: Connector model doesn't have deletedAt field, so we do hard delete
  // If needed in future, add deletedAt to Connector schema and migrate
  const connector = await prisma.connector.delete({
    where: { id: connectorId },
  });

  return connector;
};
