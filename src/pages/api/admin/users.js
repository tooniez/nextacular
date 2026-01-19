/**
 * Super Admin Users API
 * GET: Get all end users from all workspaces
 * POST: Create new end user
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
      const search = req.query.search || '';
      const role = req.query.role || 'all';
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      // Build where clause
      const where = {
        deletedAt: null, // Only active users
      };

      // Search filter
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await prisma.endUser.count({ where });

      // Get users with pagination
      const users = await prisma.endUser.findMany({
        where,
        include: {
          paymentProfile: {
            select: {
              id: true,
              stripePaymentMethodId: true,
              status: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Get workspace associations through sessions (most recent session's workspace)
      const userIds = users.map(u => u.id);
      const recentSessions = await prisma.chargingSession.findMany({
        where: {
          endUserId: { in: userIds },
        },
        select: {
          endUserId: true,
          workspaceId: true,
          startTime: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      // Get unique workspace IDs
      const workspaceIds = [...new Set(recentSessions.map(s => s.workspaceId))];
      const workspaces = await prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });
      const workspaceMap = new Map(workspaces.map(w => [w.id, w]));

      // Create a map of endUserId -> most recent workspace
      const userWorkspaceMap = new Map();
      recentSessions.forEach(s => {
        if (!userWorkspaceMap.has(s.endUserId)) {
          userWorkspaceMap.set(s.endUserId, s.workspaceId);
        }
      });

      // Format response
      const formattedUsers = users.map((user) => {
        // Get workspace from most recent session
        const workspaceId = userWorkspaceMap.get(user.id);
        const organization = workspaceId ? workspaceMap.get(workspaceId) : null;
        
        // EndUsers are typically "Conducente" (Driver) role
        const role = 'Conducente';

        // Format payment card info
        let cardInfo = null;
        if (user.paymentProfile?.stripePaymentMethodId) {
          // In a real implementation, you'd fetch card details from Stripe
          // For now, we'll just indicate if a card exists
          cardInfo = {
            hasCard: true,
            // Card details would come from Stripe API
            maskedNumber: null, // Would be fetched from Stripe
            brand: null, // Would be fetched from Stripe
          };
        }

        // Split name into firstName and lastName if possible
        const nameParts = user.name ? user.name.split(' ') : [];
        const firstName = nameParts.length > 0 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        return {
          id: user.id,
          endUserCode: user.endUserCode,
          email: user.email,
          phone: user.phone,
          name: user.name,
          firstName,
          lastName,
          rfidToken: user.rfidToken,
          status: user.status,
          disabled: user.status === 'SUSPENDED' || user.status === 'DELETED',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          organization: organization ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          } : null,
          role: role,
          cardInfo,
          organizationId: organization?.id || null,
        };
      });

      // Filter by role if specified
      let filteredUsers = formattedUsers;
      if (role && role !== 'all') {
        filteredUsers = formattedUsers.filter(u => u.role === role);
      }

      res.status(200).json({
        data: filteredUsers,
        pagination: {
          page,
          pageSize,
          total: role !== 'all' ? filteredUsers.length : total,
          totalPages: Math.ceil((role !== 'all' ? filteredUsers.length : total) / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/users error:', error);
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

      const { email, firstName, lastName, phone, role, organizationId, disabled } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          errors: { email: { msg: 'Email is required' } },
        });
      }

      // Check if email already exists
      const existingUser = await prisma.endUser.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          errors: { email: { msg: 'User with this email already exists' } },
        });
      }

      // Create user
      const name = [firstName, lastName].filter(Boolean).join(' ') || null;
      const status = disabled ? 'SUSPENDED' : 'ACTIVE';

      const newUser = await prisma.endUser.create({
        data: {
          email,
          name,
          phone: phone || null,
          status,
        },
      });

      // Note: EndUser doesn't have direct workspace membership
      // They are associated through charging sessions
      // Organization association happens when they use stations from that workspace

      res.status(201).json({ data: newUser });
    } catch (error) {
      console.error('POST /api/admin/users error:', error);
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
