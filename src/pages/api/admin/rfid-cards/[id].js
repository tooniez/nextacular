/**
 * Super Admin RFID Card Detail API
 * GET: Get single RFID card details
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Card ID is required' } },
        });
      }

      // Get user (RFID card)
      const user = await prisma.endUser.findUnique({
        where: { id },
        include: {
          paymentProfile: {
            select: {
              id: true,
              stripePaymentMethodId: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          errors: { card: { msg: 'Card not found' } },
        });
      }

      // Get workspace association
      const recentSession = await prisma.chargingSession.findFirst({
        where: {
          endUserId: id,
        },
        select: {
          workspaceId: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      let organization = null;
      if (recentSession?.workspaceId) {
        const workspace = await prisma.workspace.findUnique({
          where: { id: recentSession.workspaceId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
        organization = workspace;
      }

      // Split name
      const nameParts = user.name ? user.name.split(' ') : [];
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Format card data
      const cardData = {
        id: user.id,
        serial: user.rfidToken,
        remainingCredit: 0, // TODO: Get from actual credit system
        expirationDate: null, // TODO: Get from actual RFID card model
        status: user.status === 'ACTIVE' ? 'Accettata' : 
               user.status === 'SUSPENDED' ? 'Bloccata' : 'Bloccata',
        type: 'Digitale', // TODO: Get from actual RFID card model
        holderId: user.id,
        holderName: user.name,
        holderEmail: user.email,
        firstName,
        lastName,
        groupSerial: null, // TODO: Get from actual RFID card model
        organization,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(200).json({ data: cardData });
    } catch (error) {
      console.error('GET /api/admin/rfid-cards/[id] error:', error);
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

export default handler;
