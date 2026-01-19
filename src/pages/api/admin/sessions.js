/**
 * Super Admin Sessions API
 * GET: Get all charging sessions from all workspaces
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { SessionStatus } from '@prisma/client';
import { getRequestId, logRequestStart, logRequestSuccess, logRequestError, sanitizeQuery } from '@/lib/server/request-logger';

const handler = async (req, res) => {
  const { method } = req;
  const requestId = getRequestId(req);
  const endpoint = '/api/admin/sessions';

  if (method === 'GET') {
    const { startTime } = logRequestStart(req, endpoint);
    
    try {
      // RBAC: Only Super Admin
      const session = await verifySuperAdmin(req, res);
      if (!session) {
        return; // verifySuperAdmin already sent response
      }

      // Get query params (sanitized for logging)
      const queryParams = sanitizeQuery(req.query);
      const workspaceSlug = req.query.workspace || req.query.workspaceSlug || 'all';
      const status = req.query.status || 'all';
      const stationId = req.query.stationId || 'all';
      const month = req.query.month || null;
      const year = req.query.year || null;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;
      
      // Enhanced logging if DEBUG_SESSIONS=1
      if (process.env.DEBUG_SESSIONS === '1') {
        console.log(`[${requestId}] Query params:`, queryParams);
      }

      // Build where clause
      const where = {};

      // Workspace filter
      if (workspaceSlug && workspaceSlug !== 'all') {
        const workspace = await prisma.workspace.findFirst({
          where: { slug: workspaceSlug },
        });
        if (workspace) {
          where.workspaceId = workspace.id;
        }
      }

      // Status filter
      if (status && status !== 'all' && Object.values(SessionStatus).includes(status)) {
        where.status = status;
      }

      // Station filter
      if (stationId && stationId !== 'all') {
        where.stationId = stationId;
      }

      // Date filters (month/year)
      if (month && year) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        where.startTime = {
          gte: startDate,
          lte: endDate,
        };
      } else if (year) {
        const yearNum = parseInt(year);
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        where.startTime = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get total count
      const countStart = Date.now();
      const total = await prisma.chargingSession.count({ where });
      const countDuration = Date.now() - countStart;
      
      if (process.env.DEBUG_SESSIONS === '1') {
        console.log(`[${requestId}] Count query: ${countDuration}ms, total: ${total}`);
      }

      // Get sessions with pagination
      const queryStart = Date.now();
      const sessions = await prisma.chargingSession.findMany({
        where,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
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
          endUser: true, // Include all endUser fields
        },
        orderBy: [
          { startTime: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const queryDuration = Date.now() - queryStart;
      
      if (process.env.DEBUG_SESSIONS === '1') {
        console.log(`[${requestId}] Query: ${queryDuration}ms, sessions: ${sessions.length}`);
      }

      // Format response with calculated fields
      const formattedSessions = sessions.map((session) => {
        // Calculate duration
        const durationSeconds = session.durationSeconds || 
          (session.endTime ? Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000) : null);
        
        const hours = durationSeconds ? Math.floor(durationSeconds / 3600) : 0;
        const minutes = durationSeconds ? Math.floor((durationSeconds % 3600) / 60) : 0;
        const seconds = durationSeconds ? durationSeconds % 60 : 0;
        const durationFormatted = durationSeconds ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : null;

        // Revenue calculations
        const energyKwh = session.energyKwh || 0;
        const pricePerKwh = session.tariffBasePricePerKwh || 0;
        const pricePerMinute = session.tariffPricePerMinute || 0;
        const sessionStartFee = session.tariffSessionStartFee || 0;
        
        // Calculate revenue
        const revenueFromEnergy = energyKwh * pricePerKwh;
        const revenueFromTime = durationSeconds ? (durationSeconds / 60) * pricePerMinute : 0;
        const totalRevenue = revenueFromEnergy + revenueFromTime + sessionStartFee;
        
        // Energy cost (placeholder - would need actual energy cost from workspace)
        const energyCostPerKwh = 0; // TODO: Get from workspace settings
        const energyCost = energyKwh * energyCostPerKwh;
        
        // Profit
        const profit = totalRevenue - energyCost;

        // Card type (from RFID token or roaming)
        let cardType = 'Digitale';
        if (session.roamingType === 'INBOUND' || session.roamingType === 'OUTBOUND') {
          cardType = 'Roaming';
        } else if (!session.endUserId && session.rfidToken) {
          cardType = 'Virtuale';
        }

        // Driver name
        let driverName = 'Ospite';
        if (session.endUser) {
          // EndUser model has 'name' field, not 'firstName'/'lastName'
          const name = session.endUser.name || '';
          const email = session.endUser.email || '';
          if (name) {
            driverName = name;
          } else if (email) {
            driverName = email;
          }
        }

        return {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          stopReason: session.stopReason,
          energyKwh,
          durationSeconds,
          durationFormatted,
          ocppTransactionId: session.ocppTransactionId,
          rfidToken: session.rfidToken,
          ocppIdTag: session.ocppIdTag,
          workspace: session.workspace,
          station: session.station,
          connector: session.connector,
          endUser: session.endUser,
          // Pricing
          pricePerKwh,
          pricePerMinute,
          sessionStartFee,
          revenueFromEnergy,
          revenueFromTime,
          totalRevenue,
          energyCostPerKwh,
          energyCost,
          profit,
          // Formatted fields
          cardType,
          driverName,
          // Gross amount (from billing)
          grossAmount: session.grossAmount,
          msFeeAmount: session.msFeeAmount,
          subCpoEarningAmount: session.subCpoEarningAmount,
        };
      });

      const response = {
        data: formattedSessions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
      
      logRequestSuccess(req, endpoint, { 
        sessionsCount: formattedSessions.length,
        total,
        page,
        pageSize 
      });
      
      res.status(200).json(response);
    } catch (error) {
      const errorLog = logRequestError(req, endpoint, error);
      
      // Determine status code
      let statusCode = 500;
      if (error.message === 'Unauthorized: Super Admin access required') {
        statusCode = 401;
      } else if (error.name === 'PrismaClientValidationError') {
        statusCode = 400;
      }
      
      if (!res.headersSent) {
        res.status(statusCode).json({
          errors: { 
            error: { 
              msg: error.message || 'Internal server error',
              requestId,
            } 
          },
        });
      }
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
