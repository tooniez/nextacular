/**
 * Super Admin Trend API
 * GET: Get aggregated trend data for charts (revenue value and number of recharges over time)
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { SessionStatus } from '@prisma/client';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      const verifyStart = Date.now();
      const session = await verifySuperAdmin(req, res);
      if (!session) {
        return; // verifySuperAdmin already sent response
      }
      const verifyEnd = Date.now();

      // Get query params
      const stationId = req.query.stationId || 'all';
      const period = req.query.period || 'lastYear'; // lastYear, lastMonth, last7d, custom
      const fromDate = req.query.fromDate || null;
      const toDate = req.query.toDate || null;

      // Calculate date range
      let startDate, endDate;
      const now = new Date();
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      switch (period) {
        case 'last7d':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'lastYear':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setMonth(5); // June (month 5, 0-indexed)
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'custom':
          if (fromDate && toDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
          } else {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 365);
          }
          break;
        default:
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setMonth(5);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
      }

      // Build where clause
      const where = {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: [SessionStatus.COMPLETED, SessionStatus.FINISHED, SessionStatus.CHARGING],
        },
      };

      // Station filter
      if (stationId && stationId !== 'all') {
        where.stationId = stationId;
      }

      // Get all sessions in the date range - OPTIMIZED: Use SQL aggregation to reduce memory
      const queryStart = Date.now();
      
      // Use Prisma raw query - fallback to findMany if raw query fails
      let dailyAggregates;
      try {
        // Try raw SQL query first (more efficient)
        // Convert enum to strings for SQL query
        const statusArray = [SessionStatus.COMPLETED, SessionStatus.FINISHED, SessionStatus.CHARGING];
        const statusStrings = statusArray.map(s => `'${s}'`).join(', ');
        
        if (stationId && stationId !== 'all') {
          dailyAggregates = await prisma.$queryRawUnsafe(`
            SELECT 
              DATE_TRUNC('day', "startTime")::date as date,
              COUNT(*)::int as count,
              COALESCE(SUM("grossAmount"), 0)::float as total_value
            FROM "chargingSessions"
            WHERE "startTime" >= $1::timestamp
              AND "startTime" <= $2::timestamp
              AND "status"::text IN (${statusStrings})
              AND "stationId" = $3
            GROUP BY DATE_TRUNC('day', "startTime")
            ORDER BY DATE_TRUNC('day', "startTime") ASC
          `, startDate, endDate, stationId);
        } else {
          dailyAggregates = await prisma.$queryRawUnsafe(`
            SELECT 
              DATE_TRUNC('day', "startTime")::date as date,
              COUNT(*)::int as count,
              COALESCE(SUM("grossAmount"), 0)::float as total_value
            FROM "chargingSessions"
            WHERE "startTime" >= $1::timestamp
              AND "startTime" <= $2::timestamp
              AND "status"::text IN (${statusStrings})
            GROUP BY DATE_TRUNC('day', "startTime")
            ORDER BY DATE_TRUNC('day', "startTime") ASC
          `, startDate, endDate);
        }
      } catch (rawError) {
        // Fallback to Prisma query if raw SQL fails
        console.error('Raw SQL query failed, using Prisma query:', rawError);
        
        const sessions = await prisma.chargingSession.findMany({
          where,
          select: {
            startTime: true,
            grossAmount: true,
          },
          take: 10000, // Limit to prevent memory issues
        });
        
        // Group by day manually
        const dailyMap = new Map();
        sessions.forEach((session) => {
          const date = new Date(session.startTime);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { date: dateKey, count: 0, totalValue: 0 });
          }
          const dayData = dailyMap.get(dateKey);
          dayData.count += 1;
          dayData.totalValue += session.grossAmount || 0;
        });
        
        dailyAggregates = Array.from(dailyMap.values()).map(item => ({
          date: item.date,
          count: item.count,
          total_value: item.totalValue,
        }));
      }
      const queryEnd = Date.now();
      
      // Convert raw results to our format
      const sessions = dailyAggregates.map(row => ({
        date: row.date,
        count: row.count,
        totalValue: parseFloat(row.total_value || 0),
      }));
      
      // Convert aggregated results to trend format (already grouped by day from SQL)
      const processingStart = Date.now();
      const trendData = sessions.map((row) => {
        const dateObj = new Date(row.date);
        return {
          date: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
          dateFormatted: formatDate(dateObj),
          value: parseFloat((row.totalValue || 0).toFixed(2)),
          count: row.count || 0,
        };
      });
      const processingEnd = Date.now();

      // Calculate totals
      const totalValue = trendData.reduce((sum, item) => sum + item.value, 0);
      const totalCount = trendData.reduce((sum, item) => sum + item.count, 0);
      const responseStart = Date.now();

      res.status(200).json({
        data: trendData,
        totals: {
          totalValue,
          totalCount,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/trend error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default handler;
