/**
 * Dashboard KPI API
 * GET: Get dashboard KPI (connectors status, active sessions, offline stations)
 */

import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';

const handler = async (req, res) => {
  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'src/pages/api/dashboard/kpi.js',
        message: 'KPI handler entry',
        data: { method: req.method, workspaceId: req.query?.workspaceId ? String(req.query.workspaceId) : null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate session
    const session = await validateSession(req, res);
    if (!session || !session.user) {
      return res.status(401).json({
        errors: { auth: { msg: 'Unauthorized' } },
      });
    }

    const workspaceSlugOrId = req.query.workspaceSlug || req.query.workspaceId;

    if (!workspaceSlugOrId) {
      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'src/pages/api/dashboard/kpi.js',
          message: 'Missing workspaceSlugOrId',
          data: { hasSession: !!session, hasUser: !!session?.user },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return res.status(400).json({
        errors: { error: { msg: 'workspaceSlug or workspaceId is required' } },
      });
    }

    try {
      const { workspaceId } = await verifyWorkspaceRole(session, String(workspaceSlugOrId), PERMISSIONS.VIEW);
      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H2',
          location: 'src/pages/api/dashboard/kpi.js',
          message: 'Workspace verified for KPI',
          data: { workspaceSlugOrId: String(workspaceSlugOrId), workspaceId: String(workspaceId) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      req.query.workspaceId = workspaceId; // normalize below code path
    } catch (e) {
      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H2',
          location: 'src/pages/api/dashboard/kpi.js',
          message: 'Workspace verification failed for KPI',
          data: { workspaceSlugOrId: String(workspaceSlugOrId), err: String(e?.message || 'error') },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return res.status(403).json({
        errors: { workspace: { msg: e?.message || 'Forbidden' } },
      });
    }

    const { workspaceId } = req.query;

    // Get connector status counts
    // Note: Connector model does not have deletedAt field
    const connectors = await prisma.connector.findMany({
      where: {
        station: {
          workspaceId,
          deletedAt: null,
        },
      },
      select: {
        status: true,
      },
    });

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'src/pages/api/dashboard/kpi.js',
        message: 'Connectors fetched',
        data: { workspaceId: String(workspaceId), connectorsCount: Array.isArray(connectors) ? connectors.length : null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const connectorStats = {
      libere: 0,      // AVAILABLE
      inRicarica: 0,  // OCCUPIED
      prenotate: 0,   // RESERVED
      nonFunzionanti: 0, // FAULTED + UNAVAILABLE
    };

    connectors.forEach((connector) => {
      switch (connector.status) {
        case 'AVAILABLE':
          connectorStats.libere++;
          break;
        case 'OCCUPIED':
          connectorStats.inRicarica++;
          break;
        case 'RESERVED':
          connectorStats.prenotate++;
          break;
        case 'FAULTED':
        case 'UNAVAILABLE':
          connectorStats.nonFunzionanti++;
          break;
      }
    });

    // Get offline stations (no heartbeat in last 10 minutes or status OFFLINE)
    const now = new Date();
    const HEARTBEAT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    const stations = await prisma.chargingStation.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        lastHeartbeat: true,
        ocppId: true,
        workspace: {
          select: {
            name: true,
          },
        },
      },
    });

    const offlineStations = stations
      .filter((station) => {
        if (station.status === 'OFFLINE') return true;
        if (!station.lastHeartbeat) return true;
        const timeSinceHeartbeat = now - new Date(station.lastHeartbeat);
        return timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS;
      })
      .map((station) => {
        const lastUpdate = station.lastHeartbeat || new Date();
        const timeSinceHeartbeat = now - new Date(lastUpdate);
        let reason = 'Unknown';
        
        if (station.status === 'OFFLINE') {
          reason = 'Station offline';
        } else if (!station.lastHeartbeat) {
          reason = 'No heartbeat received';
        } else if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
          reason = `Connection timeout (${Math.floor(timeSinceHeartbeat / 60000)} min ago)`;
        }
        
        return {
          id: station.id,
          name: station.name || station.ocppId || 'Unknown',
          provider: station.workspace?.name || 'Unknown',
          lastUpdate: lastUpdate,
          reason: reason,
        };
      })
      .slice(0, 10); // Limit to 10

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'src/pages/api/dashboard/kpi.js',
        message: 'Stations fetched + offline computed',
        data: {
          workspaceId: String(workspaceId),
          stationsCount: Array.isArray(stations) ? stations.length : null,
          offlineStationsCount: Array.isArray(offlineStations) ? offlineStations.length : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // Get stations pending approval (if you have a status field for this)
    const pendingStations = [];

    // Get active charging sessions
    const activeSessions = await prisma.chargingSession.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        stationId: true,
        connectorId: true,
        startTime: true,
        station: {
          select: {
            name: true,
            ocppId: true,
            location: true,
          },
        },
        ocppTransactionId: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 10,
    });

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'src/pages/api/dashboard/kpi.js',
        message: 'Active sessions fetched',
        data: { workspaceId: String(workspaceId), activeSessionsCount: Array.isArray(activeSessions) ? activeSessions.length : null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const sessionsInProgress = activeSessions.map((session) => ({
      id: session.id,
      sessionId: `${session.station?.ocppId || 'UNKNOWN'}-${session.connectorId}`,
      location: session.station?.location || 'Location not available',
      transactionId: Number.isFinite(Number(session.ocppTransactionId)) ? String(session.ocppTransactionId) : 'N/A',
      startTime: session.startTime,
    }));

    return res.status(200).json({
      data: {
        connectors: connectorStats,
        offlineStations,
        pendingStations,
        sessionsInProgress,
      },
    });
  } catch (error) {
    console.error('[api/dashboard/kpi] Error:', error);

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
