/**
 * Competenze (Earnings Report) API for Organizations
 * GET: Get detailed transaction report for a specific period
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { SessionStatus, PaymentStatus, ClearingStatus } from '@prisma/client';

const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // RBAC: Super Admin only (admin namespace)
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      return;
    }

    const { id: workspaceId } = req.query;
    const { month, year, from, to } = req.query;

    // Calculate date range
    let periodStart, periodEnd;
    
    if (month && year) {
      // Specific month/year
      periodStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      periodEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else if (from && to) {
      // Custom date range
      periodStart = new Date(from);
      periodEnd = new Date(to);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      // Default: current month
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get all completed sessions for this workspace in the period
    const sessions = await prisma.chargingSession.findMany({
      where: {
        workspaceId,
        status: SessionStatus.COMPLETED,
        startTime: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        station: {
          select: {
            id: true,
            ocppId: true,
            name: true,
            location: true,
          },
        },
        connector: {
          select: {
            id: true,
            connectorId: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Format sessions with detailed calculations
    const formattedSessions = sessions.map((session) => {
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : null;
      const durationMinutes = endTime
        ? Math.round((endTime - startTime) / 1000 / 60)
        : 0;
      const durationHours = durationMinutes / 60;

      // Calculate revenue per kWh
      const energyKwh = session.energyKwh || 0;
      const grossAmount = session.grossAmount || 0;
      const revenuePerKwh = energyKwh > 0 ? grossAmount / energyKwh : 0;

      // Calculate revenue per hour
      const revenuePerHour = durationHours > 0 ? grossAmount / durationHours : 0;

      // Collection fees (1.5% + €0.25) - per transaction
      const collectionFeePercent = 1.5;
      const collectionFeeFixed = 0.25;
      const collectionFee = (grossAmount * (collectionFeePercent / 100)) + collectionFeeFixed;

      // Net revenue
      const netRevenue = grossAmount - collectionFee;

      // Roaming status
      const isRoaming = session.roamingType && session.roamingType !== 'NONE';
      const roamingStatus = isRoaming ? 'Si' : 'No';

      return {
        id: session.id,
        startTime: startTime,
        endTime: endTime,
        connectorId: session.connector.connectorId,
        stationName: session.station.name || session.station.ocppId,
        stationLocation: session.station.location,
        energyKwh: energyKwh,
        durationMinutes: durationMinutes,
        durationHours: durationHours,
        revenuePerKwh: revenuePerKwh,
        revenuePerHour: revenuePerHour,
        grossRevenue: grossAmount,
        collectionFee: collectionFee,
        netRevenue: netRevenue,
        roaming: roamingStatus,
        roamingType: session.roamingType,
        currency: session.currency || 'EUR',
        // Additional details
        msFeeAmount: session.msFeeAmount || 0,
        subCpoEarning: session.subCpoEarningAmount || 0,
        paymentStatus: session.paymentStatus,
        clearingStatus: session.clearingStatus,
      };
    });

    // Calculate totals
    const totals = formattedSessions.reduce(
      (acc, session) => ({
        totalSessions: acc.totalSessions + 1,
        totalEnergyKwh: acc.totalEnergyKwh + session.energyKwh,
        totalGrossRevenue: acc.totalGrossRevenue + session.grossRevenue,
        totalCollectionFees: acc.totalCollectionFees + session.collectionFee,
        totalNetRevenue: acc.totalNetRevenue + session.netRevenue,
        totalMsFee: acc.totalMsFee + session.msFeeAmount,
        totalSubCpoEarning: acc.totalSubCpoEarning + session.subCpoEarning,
      }),
      {
        totalSessions: 0,
        totalEnergyKwh: 0,
        totalGrossRevenue: 0,
        totalCollectionFees: 0,
        totalNetRevenue: 0,
        totalMsFee: 0,
        totalSubCpoEarning: 0,
      }
    );

    // Get workspace info for header
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        slug: true,
      },
    });

    return res.status(200).json({
      data: {
        workspace: {
          name: workspace?.name || 'Unknown',
          slug: workspace?.slug || '',
        },
        period: {
          start: periodStart,
          end: periodEnd,
          month: periodStart.getMonth() + 1,
          year: periodStart.getFullYear(),
        },
        sessions: formattedSessions,
        totals: {
          ...totals,
          currency: formattedSessions[0]?.currency || 'EUR',
        },
      },
    });
  } catch (error) {
    console.error('[api/admin/workspaces/[id]/competenze] Error:', error);

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
