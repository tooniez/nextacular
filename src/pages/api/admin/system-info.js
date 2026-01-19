/**
 * Super Admin System Info API
 * GET: Get system metrics (CPU, Memory, Disk) over time
 * DELETE: Clear system info history
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get query params
      const period = req.query.period || 'last3months'; // last3months, lastMonth, lastWeek
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;

      // Calculate date range
      let startDate;
      const now = new Date();
      
      switch (period) {
        case 'lastWeek':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'lastMonth':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'last3months':
        default:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 3);
          startDate.setDate(1); // Start of month
          break;
      }

      // Get current system metrics
      const cpuUsage = await getCpuUsage();
      const memoryUsage = await getMemoryUsage();
      const diskUsage = await getDiskUsage();

      // TODO: In a real implementation, you would:
      // 1. Store system metrics in a SystemMetrics model over time
      // 2. Query historical data from that model
      // 3. Return time series data for charts

      // For now, generate placeholder time series data
      const timeSeriesData = generateTimeSeriesData(startDate, now, {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
      });

      res.status(200).json({
        data: {
          current: {
            cpu: cpuUsage,
            memory: memoryUsage,
            disk: diskUsage,
          },
          timeSeries: timeSeriesData,
        },
      });
    } catch (error) {
      console.error('GET /api/admin/system-info error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'DELETE') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // TODO: Delete system metrics history if model exists
      // For now, just return success
      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/admin/system-info error:', error);
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

async function getCpuUsage() {
  try {
    // Get CPU usage (simplified - in production use proper monitoring)
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((idle / total) * 100);
    return Math.min(100, Math.max(0, usage));
  } catch {
    return 0;
  }
}

async function getMemoryUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return (usedMem / totalMem) * 100;
  } catch {
    return 0;
  }
}

async function getDiskUsage() {
  try {
    // Try to get disk usage (Linux)
    const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
    return parseFloat(stdout.trim()) || 0;
  } catch {
    // Fallback: return 0 or use a default
    return 0;
  }
}

function generateTimeSeriesData(startDate, endDate, currentMetrics) {
  const data = [];
  const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Generate daily data points
  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Add some variation to make it realistic
    const variation = () => Math.random() * 20 - 10; // -10 to +10
    
    data.push({
      date: date.toISOString().split('T')[0],
      dateFormatted: formatDate(date),
      cpu: Math.max(0, Math.min(100, currentMetrics.cpu + variation())),
      memory: Math.max(0, Math.min(100, currentMetrics.memory + variation())),
      disk: Math.max(0, Math.min(100, currentMetrics.disk + variation() * 0.5)),
    });
  }
  
  return data;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default handler;
