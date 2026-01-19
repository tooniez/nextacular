import prisma from '@/prisma/index';
import { SessionStatus } from '@prisma/client';

/**
 * Get revenue dashboard data for workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
export const getRevenueDashboard = async (workspaceId, fromDate, toDate) => {
  // Ensure dates are at start/end of day
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  // Get totals from completed sessions
  const sessions = await prisma.chargingSession.findMany({
    where: {
      workspaceId,
      status: 'COMPLETED',
      startTime: {
        gte: from,
        lte: to,
      },
    },
    select: {
      id: true,
      energyKwh: true,
      grossAmount: true,
      msFeeAmount: true,
      subCpoEarningAmount: true,
      startTime: true,
      stationId: true,
      station: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Calculate totals
  const totals = {
    sessionsCount: sessions.length,
    totalKwh: sessions.reduce((sum, s) => sum + (s.energyKwh || 0), 0),
    grossRevenue: sessions.reduce((sum, s) => sum + (s.grossAmount || 0), 0),
    subCpoEarnings: sessions.reduce((sum, s) => sum + (s.subCpoEarningAmount || 0), 0),
    msFees: sessions.reduce((sum, s) => sum + (s.msFeeAmount || 0), 0),
  };

  totals.avgPricePerKwh = totals.totalKwh > 0 
    ? totals.grossRevenue / totals.totalKwh 
    : 0;

  // Group by day for time series
  const dailyMap = new Map();
  
  sessions.forEach((session) => {
    const dateKey = session.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        kwh: 0,
        grossRevenue: 0,
        subCpoEarnings: 0,
        msFees: 0,
        sessionsCount: 0,
      });
    }
    
    const day = dailyMap.get(dateKey);
    day.kwh += session.energyKwh || 0;
    day.grossRevenue += session.grossAmount || 0;
    day.subCpoEarnings += session.subCpoEarningAmount || 0;
    day.msFees += session.msFeeAmount || 0;
    day.sessionsCount += 1;
  });

  // Convert to array and sort by date
  const timeSeries = Array.from(dailyMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  // Fill missing days with zeros (optional - for better chart visualization)
  const filledTimeSeries = [];
  const currentDate = new Date(from);
  while (currentDate <= to) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey);
    
    filledTimeSeries.push(existing || {
      date: dateKey,
      kwh: 0,
      grossRevenue: 0,
      subCpoEarnings: 0,
      msFees: 0,
      sessionsCount: 0,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Top stations (by gross revenue)
  const stationMap = new Map();
  
  sessions.forEach((session) => {
    if (!session.station) return;
    
    const stationId = session.station.id;
    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, {
        stationId,
        stationName: session.station.name,
        sessionsCount: 0,
        totalKwh: 0,
        grossRevenue: 0,
      });
    }
    
    const station = stationMap.get(stationId);
    station.sessionsCount += 1;
    station.totalKwh += session.energyKwh || 0;
    station.grossRevenue += session.grossAmount || 0;
  });

  // Sort by gross revenue descending and take top 5
  const topStations = Array.from(stationMap.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue)
    .slice(0, 5);

  // Operational metrics
  const [activeStations, offlineStations, connectors] = await Promise.all([
    prisma.chargingStation.count({
      where: {
        workspaceId,
        deletedAt: null,
      },
    }),
    prisma.chargingStation.count({
      where: {
        workspaceId,
        status: 'OFFLINE',
        deletedAt: null,
      },
    }),
    prisma.connector.count({
      where: {
        station: {
          workspaceId,
          deletedAt: null,
        },
      },
    }),
  ]);

  return {
    totals,
    timeSeries: filledTimeSeries,
    topStations,
    operational: {
      activeStationsCount: activeStations,
      offlineStationsCount: offlineStations,
      connectorsCount: connectors,
    },
  };
};
