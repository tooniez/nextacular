/**
 * Super Admin Blocked IPs API
 * GET: Get all blocked IPs and failed login attempts
 * POST: Block an IP
 * PUT: Unblock an IP
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      // Get query params
      const filter = req.query.filter || 'all'; // all, blocked, unblocked
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      // TODO: In a real implementation, you would:
      // 1. Query a BlockedIp model if it exists
      // 2. Or query OpsEvent for failed login attempts and aggregate by IP
      // 3. Get IP geolocation data for country flags

      // For now, we'll use OpsEvent to find failed login attempts
      const failedLoginEvents = await prisma.opsEvent.findMany({
        where: {
          OR: [
            { eventType: { contains: 'LOGIN_FAILED', mode: 'insensitive' } },
            { message: { contains: 'login failed', mode: 'insensitive' } },
            { message: { contains: 'failed login', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          message: true,
          context: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1000, // Get recent events
      });

      // Extract IPs from events and aggregate
      const ipMap = new Map();
      
      failedLoginEvents.forEach((event) => {
        // Try to extract IP from message or context
        let ip = null;
        if (event.context && typeof event.context === 'object') {
          ip = event.context.ip || event.context.ipAddress || null;
        }
        if (!ip && event.message) {
          const ipMatch = event.message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
          if (ipMatch) {
            ip = ipMatch[0];
          }
        }

        if (ip) {
          if (!ipMap.has(ip)) {
            ipMap.set(ip, {
              ip,
              failedLogins: 0,
              lastAttempt: null,
              blocked: false, // TODO: Check if actually blocked
              unblockDate: null, // TODO: Get from blocked IP model
              country: 'UNKNOWN', // TODO: Get from geolocation service
              countryCode: 'XX',
            });
          }
          const ipData = ipMap.get(ip);
          ipData.failedLogins += 1;
          if (!ipData.lastAttempt || new Date(event.createdAt) > new Date(ipData.lastAttempt)) {
            ipData.lastAttempt = event.createdAt;
          }
        }
      });

      // Convert to array and sort
      let ipList = Array.from(ipMap.values())
        .sort((a, b) => new Date(b.lastAttempt) - new Date(a.lastAttempt));

      // Filter by blocked status
      if (filter === 'blocked') {
        ipList = ipList.filter(ip => ip.blocked);
      } else if (filter === 'unblocked') {
        ipList = ipList.filter(ip => !ip.blocked);
      }

      // Paginate
      const total = ipList.length;
      const paginatedList = ipList.slice(
        (page - 1) * pageSize,
        page * pageSize
      );

      res.status(200).json({
        data: paginatedList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/blocked-ips error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'POST') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({
          errors: { ip: { msg: 'IP address is required' } },
        });
      }

      // TODO: In a real implementation, you would:
      // 1. Create a BlockedIp record
      // 2. Add IP to firewall/blocking system
      // 3. Set unblock date if temporary

      res.status(201).json({ 
        data: { 
          ip,
          blocked: true,
          blockedAt: new Date(),
        } 
      });
    } catch (error) {
      console.error('POST /api/admin/blocked-ips error:', error);
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'PUT') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({
          errors: { ip: { msg: 'IP address is required' } },
        });
      }

      // TODO: In a real implementation, you would:
      // 1. Update BlockedIp record to unblock
      // 2. Remove IP from firewall/blocking system

      res.status(200).json({ 
        data: { 
          ip,
          blocked: false,
          unblockedAt: new Date(),
        } 
      });
    } catch (error) {
      console.error('PUT /api/admin/blocked-ips error:', error);
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

export default handler;
