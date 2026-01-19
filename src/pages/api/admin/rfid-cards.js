/**
 * Super Admin RFID Cards API
 * GET: Get all RFID cards (EndUsers with rfidToken)
 * PUT: Update RFID card
 * DELETE: Delete RFID card
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
      const status = req.query.status || 'all';
      const type = req.query.type || 'all';
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      // Build where clause
      const where = {
        deletedAt: null,
        rfidToken: { not: null }, // Only users with RFID cards
      };

      // Search filter
      if (search) {
        where.OR = [
          { rfidToken: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Status filter
      if (status && status !== 'all') {
        if (status === 'Accettata') {
          where.status = 'ACTIVE';
        } else if (status === 'Bloccata') {
          where.status = 'SUSPENDED';
        } else {
          where.status = status;
        }
      }

      // Get total count
      const total = await prisma.endUser.count({ where });

      // Get users with RFID cards
      const users = await prisma.endUser.findMany({
        where,
        include: {
          paymentProfile: {
            select: {
              id: true,
              stripePaymentMethodId: true,
            },
          },
          sessions: {
            select: {
              id: true,
              startTime: true,
              energyKwh: true,
              grossAmount: true,
            },
            orderBy: {
              startTime: 'desc',
            },
            take: 1, // Just to check if user has sessions
          },
        },
        orderBy: [
          { updatedAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Get workspace associations through sessions
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

      const workspaceIds = [...new Set(recentSessions.map(s => s.workspaceId))];
      const workspaces = await prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: { id: true, name: true },
      });
      const workspaceMap = new Map(workspaces.map(w => [w.id, w]));

      const userWorkspaceMap = new Map();
      recentSessions.forEach(s => {
        if (!userWorkspaceMap.has(s.endUserId)) {
          userWorkspaceMap.set(s.endUserId, s.workspaceId);
        }
      });

      // Format response
      const formattedCards = users.map((user) => {
        const workspaceId = userWorkspaceMap.get(user.id);
        const organization = workspaceId ? workspaceMap.get(workspaceId) : null;

        // Determine card type based on user data
        // In a real implementation, this would come from a separate RFID card model
        let cardType = 'Digitale';
        if (user.sessions && user.sessions.length > 0) {
          // Check if user has roaming sessions (would need to check session data)
          cardType = 'Fisica'; // Default assumption
        }

        // Remaining credit from stored-value balance (rfidBalanceCents)
        const remainingCredit = (user.rfidBalanceCents || 0) / 100;

        // Expiration date (placeholder - would need actual expiration tracking)
        const expirationDate = null; // TODO: Get from actual RFID card model

        // Group serial (placeholder)
        const groupSerial = null;

        // Status mapping
        const cardStatus = user.status === 'ACTIVE' ? 'Accettata' : 
                         user.status === 'SUSPENDED' ? 'Bloccata' : 'Bloccata';

        // Split name
        const nameParts = user.name ? user.name.split(' ') : [];
        const firstName = nameParts.length > 0 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        return {
          id: user.id,
          serial: user.rfidToken,
          type: cardType,
          holder: user.name || user.email || 'Non Assegnata',
          holderEmail: user.email,
          holderName: user.name,
          firstName,
          lastName,
          remainingCredit,
          expirationDate,
          groupSerial,
          status: cardStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          organization: organization ? {
            id: organization.id,
            name: organization.name,
          } : null,
        };
      });

      // Filter by type if specified
      let filteredCards = formattedCards;
      if (type && type !== 'all') {
        filteredCards = formattedCards.filter(c => c.type === type);
      }

      res.status(200).json({
        data: filteredCards,
        pagination: {
          page,
          pageSize,
          total: type !== 'all' ? filteredCards.length : total,
          totalPages: Math.ceil((type !== 'all' ? filteredCards.length : total) / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/rfid-cards error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'PUT') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { id } = req.query;
      const { serial, remainingCredit, expirationDate, status, type, holderId, groupSerial } = req.body;

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Card ID is required' } },
        });
      }

      // Update user (RFID card is linked to EndUser)
      const updateData = {};
      
      if (serial !== undefined) {
        updateData.rfidToken = serial;
      }
      
      if (status !== undefined) {
        // Map status
        if (status === 'Accettata') {
          updateData.status = 'ACTIVE';
        } else if (status === 'Bloccata') {
          updateData.status = 'SUSPENDED';
        } else {
          updateData.status = status;
        }
      }

      // TODO: Update remainingCredit, expirationDate, type, groupSerial
      // These would need to be stored in a separate RFID card model or JSON field

      const updatedUser = await prisma.endUser.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({ data: updatedUser });
    } catch (error) {
      console.error('PUT /api/admin/rfid-cards error:', error);
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'DELETE') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Card ID is required' } },
        });
      }

      // Soft delete user (RFID card)
      await prisma.endUser.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'DELETED',
        },
      });

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      console.error('DELETE /api/admin/rfid-cards error:', error);
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
