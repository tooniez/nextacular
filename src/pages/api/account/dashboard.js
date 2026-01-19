/**
 * Super Admin Dashboard API
 * GET: Get aggregated dashboard data for super admin (all workspaces)
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import { getOperationsDashboardKPI } from '@/prisma/services/ops-monitoring';
import prisma from '@/prisma/index';
import { StationStatus, SessionStatus } from '@prisma/client';
import os from 'os';
import fs from 'fs';
import { performance } from 'perf_hooks';

let lastCpuSample = null;

function getCpuSample() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function getCpuPercent() {
  const sample = getCpuSample();
  if (!lastCpuSample) {
    lastCpuSample = sample;
    return 0;
  }
  const idleDelta = sample.idle - lastCpuSample.idle;
  const totalDelta = sample.total - lastCpuSample.total;
  lastCpuSample = sample;
  if (totalDelta <= 0) return 0;
  const used = 1 - idleDelta / totalDelta;
  return Math.max(0, Math.min(100, used * 100));
}

function getMemoryPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return 0;
  return Math.max(0, Math.min(100, (1 - free / total) * 100));
}

function getDiskPercent(path = '/') {
  try {
    const stat = fs.statfsSync(path, { bigint: true });
    const total = stat.blocks * stat.bsize;
    const free = stat.bfree * stat.bsize;
    if (total <= 0n) return 0;
    const used = total - free;
    // keep 2 decimals without floating overflow
    return Number((used * 10000n) / total) / 100;
  } catch {
    return 0;
  }
}

const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // RBAC: Only Super Admin
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      return; // verifySuperAdmin already sent response
    }

    // Get KPI (all workspaces)
    const kpi = await getOperationsDashboardKPI(null);

    // Get offline stations (all workspaces, limit 20)
    // Simplified query to avoid nested relation issues
    const offlineStationsRaw = await prisma.chargingStation.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: StationStatus.OFFLINE },
          { status: StationStatus.FAULTED },
        ],
      },
      select: {
        id: true,
        ocppId: true,
        name: true,
        status: true,
        lastHeartbeat: true,
        location: true,
        workspaceId: true,
      },
      orderBy: { lastHeartbeat: 'asc' },
      take: 20,
    });

    // Get workspace names separately
    const workspaceIds = [...new Set(offlineStationsRaw.map(s => s.workspaceId))];
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true, slug: true },
    });
    const workspaceMap = new Map(workspaces.map(w => [w.id, w]));

    // Format offline stations with error messages
    const formattedOfflineStations = offlineStationsRaw.map((station) => {
      const workspace = workspaceMap.get(station.workspaceId);
      let errorMessage = null;
      
      if (!station.lastHeartbeat) {
        errorMessage = 'No heartbeat received';
      } else {
        const minutesAgo = Math.floor((Date.now() - new Date(station.lastHeartbeat).getTime()) / 60000);
        errorMessage = `Last heartbeat: ${minutesAgo} minutes ago`;
      }

      return {
        id: station.id,
        ocppId: station.ocppId,
        name: station.name,
        network: workspace?.name || 'Unknown',
        workspaceSlug: workspace?.slug || '',
        status: station.status,
        lastHeartbeat: station.lastHeartbeat,
        location: station.location,
        errorMessage,
        timestamp: station.lastHeartbeat || new Date(),
      };
    });

    // Get active charging sessions (all workspaces, limit 20)
    // Simplified query to avoid nested relation issues
    const activeSessionsRaw = await prisma.chargingSession.findMany({
      where: {
        status: SessionStatus.ACTIVE,
        endTime: null,
      },
      select: {
        id: true,
        ocppTransactionId: true,
        startTime: true,
        energyKwh: true,
        stationId: true,
        connectorId: true,
        endUserId: true,
      },
      orderBy: { startTime: 'desc' },
      take: 20,
    });

    // Get related data separately
    const stationIds = [...new Set(activeSessionsRaw.map(s => s.stationId))];
    const connectorIds = [...new Set(activeSessionsRaw.map(s => s.connectorId))];
    const endUserIds = [...new Set(activeSessionsRaw.filter(s => s.endUserId).map(s => s.endUserId))];

    const [stations, connectors, endUsers] = await Promise.all([
      prisma.chargingStation.findMany({
        where: { id: { in: stationIds } },
        select: {
          id: true,
          ocppId: true,
          name: true,
          location: true,
          workspaceId: true,
        },
      }),
      prisma.connector.findMany({
        where: { id: { in: connectorIds } },
        select: { id: true, connectorId: true },
      }),
      endUserIds.length > 0 ? prisma.endUser.findMany({
        where: { id: { in: endUserIds } },
        select: { id: true, name: true, email: true },
      }) : [],
    ]);

    const stationMap = new Map(stations.map(s => [s.id, s]));
    const connectorMap = new Map(connectors.map(c => [c.id, c]));
    const endUserMap = new Map(endUsers.map(u => [u.id, u]));

    // Get workspace names for stations
    const stationWorkspaceIds = [...new Set(stations.map(s => s.workspaceId))];
    const stationWorkspaces = await prisma.workspace.findMany({
      where: { id: { in: stationWorkspaceIds } },
      select: { id: true, name: true, slug: true },
    });
    const stationWorkspaceMap = new Map(stationWorkspaces.map(w => [w.id, w]));

    // Format active sessions
    const formattedActiveSessions = activeSessionsRaw.map((session) => {
      const station = stationMap.get(session.stationId);
      const connector = connectorMap.get(session.connectorId);
      const endUser = session.endUserId ? endUserMap.get(session.endUserId) : null;
      const workspace = station ? stationWorkspaceMap.get(station.workspaceId) : null;

      const stationOcppId = station?.ocppId || 'Unknown';
      const connectorId = connector?.connectorId || 0;
      const sessionId = `${stationOcppId}-${connectorId}`;
      
      return {
        id: session.id,
        sessionId,
        stationId: stationOcppId,
        location: station?.location || station?.name || 'Unknown',
        workspaceName: workspace?.name || 'Unknown',
        workspaceSlug: workspace?.slug || '',
        transactionId: session.ocppTransactionId,
        startTime: session.startTime,
        energyKwh: session.energyKwh,
        endUserName: endUser?.name || endUser?.email || 'Guest',
        timestamp: session.startTime,
      };
    });

    // Calculate KPI cards (based on connector status)
    const connectorStats = kpi.connectors || {};
    const kpiCards = {
      libere: connectorStats.available || 0, // AVAILABLE connectors
      inRicarica: connectorStats.charging || 0, // OCCUPIED connectors
      prenotate: 0, // RESERVED connectors (not tracked in current schema, set to 0)
      nonFunzionanti: (connectorStats.faulted || 0) + (kpi.stations?.faulted || 0), // FAULTED connectors + FAULTED stations
    };

    // System info
    const cpuPercent = getCpuPercent();
    const memoryPercent = getMemoryPercent();
    const diskPercent = getDiskPercent('/');
    let latency = 0;
    try {
      const t0 = performance.now();
      // DB ping as proxy of platform latency
      await prisma.$queryRaw`SELECT 1`;
      latency = performance.now() - t0;
    } catch {
      latency = 0;
    }

    const systemInfo = { cpuPercent, memoryPercent, diskPercent, latency };

    return res.status(200).json({
      data: {
        kpi: kpiCards,
        kpiDetails: kpi,
        offlineStations: formattedOfflineStations,
        activeSessions: formattedActiveSessions,
        systemInfo,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[api/account/dashboard] Error:', error);

    if (res.headersSent) {
      return;
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
      });
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
