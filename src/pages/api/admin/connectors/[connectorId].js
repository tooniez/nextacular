/**
 * Super Admin Connector API
 * PATCH: Update connector
 * DELETE: Delete connector
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { ConnectorStatus } from '@prisma/client';

const handler = async (req, res) => {
  const { method } = req;
  const { connectorId } = req.query;

  if (method === 'PATCH') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { name, status, maxPower, connectorType } = req.body;

      const connector = await prisma.connector.update({
        where: { id: connectorId },
        data: {
          ...(name !== undefined && { name }),
          ...(status !== undefined && { status }),
          ...(maxPower !== undefined && { maxPower: maxPower ? parseFloat(maxPower) : null }),
          ...(connectorType !== undefined && { connectorType }),
        },
      });

      res.status(200).json({ data: connector });
    } catch (error) {
      console.error('PATCH /api/admin/connectors/[connectorId] error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({
          errors: { connector: { msg: 'Connector not found' } },
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

      await prisma.connector.delete({
        where: { id: connectorId },
      });

      res.status(200).json({ data: { id: connectorId } });
    } catch (error) {
      console.error('DELETE /api/admin/connectors/[connectorId] error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({
          errors: { connector: { msg: 'Connector not found' } },
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
