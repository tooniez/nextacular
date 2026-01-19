/**
 * Organizations (Sub CPO) API
 * GET: Get all organizations with statistics for super admin
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { StationStatus, SessionStatus } from '@prisma/client';

const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // RBAC: Super Admin only (global organizations view)
    const session = await verifySuperAdmin(req, res);
    if (!session) {
      return; // verifyOrganizationsPermission already sent response
    }

    const { search = '', status = 'all', page = 1, pageSize = 20 } = req.query;

    // Build where clause
    const where = {
      deletedAt: null,
    };

    if (status === 'active') {
      where.isActive = true;
      where.isSuspended = false;
    } else if (status === 'suspended') {
      where.isSuspended = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // Get workspaces with creator info
    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          isSuspended: true,
          suspendedAt: true,
          suspensionReason: true,
          defaultMsFeePercent: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          // Get first station for address info (if available)
          chargingStations: {
            where: { deletedAt: null },
            take: 1,
            select: {
              location: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(pageSize),
      }),
      prisma.workspace.count({ where }),
    ]);

    // Get statistics for each workspace
    const workspaceIds = workspaces.map(w => w.id);
    
    const [stationsCounts, sessionsCounts, revenueData] = await Promise.all([
      // Count stations per workspace
      prisma.chargingStation.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      }),
      // Count active sessions per workspace
      prisma.chargingSession.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          status: SessionStatus.ACTIVE,
          endTime: null,
        },
        _count: {
          id: true,
        },
      }),
      // Get revenue (total gross amount) per workspace (last 30 days)
      prisma.chargingSession.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          status: SessionStatus.COMPLETED,
          startTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _sum: {
          grossAmount: true,
        },
      }),
    ]);

    // Create maps for quick lookup
    const stationsMap = new Map(stationsCounts.map(s => [s.workspaceId, s._count.id]));
    const sessionsMap = new Map(sessionsCounts.map(s => [s.workspaceId, s._count.id]));
    const revenueMap = new Map(revenueData.map(r => [r.workspaceId, r._sum.grossAmount || 0]));

    // Enrich workspaces with statistics and additional info
    const enrichedWorkspaces = workspaces.map(ws => {
      const firstStation = ws.chargingStations?.[0];
      const location = firstStation?.location || '';
      
      // Parse location to extract address components (basic parsing)
      const locationParts = location.split(',').map(p => p.trim());
      const address = locationParts[0] || '';
      const capComune = locationParts[1] || '';
      const capMatch = capComune.match(/(\d{5})/);
      const cap = capMatch ? capMatch[1] : '';
      const comune = capComune.replace(/\d{5}\s*/, '').trim() || '';
      
      return {
        ...ws,
        stationsCount: stationsMap.get(ws.id) || 0,
        activeSessionsCount: sessionsMap.get(ws.id) || 0,
        revenue30Days: revenueMap.get(ws.id) || 0,
        // Additional fields for display
        address: address,
        cap: cap,
        comune: comune,
        referente: ws.creator?.name || '',
        email: ws.creator?.email || '',
        lastUpdate: ws.updatedAt || ws.createdAt,
        // Remove nested objects for cleaner response
        creator: undefined,
        chargingStations: undefined,
      };
    });

    return res.status(200).json({
      data: {
        data: enrichedWorkspaces,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      },
    });
  } catch (error) {
    console.error('[api/account/organizations] Error:', error);

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
