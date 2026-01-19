/**
 * Kill Switch API
 * GET: Get kill switch status
 * PATCH: Activate/deactivate kill switch
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const KILL_SWITCH_TYPES = ['paymentsEnabled', 'roamingEnabled', 'newSessionsEnabled'];

const handler = async (req, res) => {
  try {
    // RBAC: Only Super Admin
    const session = await verifySuperAdmin(req, res);

    if (req.method === 'GET') {
      const switches = await prisma.opsKillSwitch.findMany({
        orderBy: { switchType: 'asc' },
      });

      // Ensure all switch types exist (with defaults)
      const result = KILL_SWITCH_TYPES.map((type) => {
        const existing = switches.find((s) => s.switchType === type);
        return existing || {
          switchType: type,
          enabled: true,
          activatedAt: null,
          deactivatedAt: null,
        };
      });

      return res.status(200).json({ data: result });
    }

    if (req.method === 'PATCH') {
      const { switchType, enabled, reason } = req.body;

      if (!switchType || typeof enabled !== 'boolean') {
        return res.status(400).json({
          errors: { validation: { msg: 'switchType and enabled are required' } },
        });
      }

      if (!KILL_SWITCH_TYPES.includes(switchType)) {
        return res.status(400).json({
          errors: { validation: { msg: `switchType must be one of: ${KILL_SWITCH_TYPES.join(', ')}` } },
        });
      }

      // Find or create kill switch
      let killSwitch = await prisma.opsKillSwitch.findUnique({
        where: { switchType },
      });

      if (!killSwitch) {
        killSwitch = await prisma.opsKillSwitch.create({
          data: {
            switchType,
            enabled: true,
          },
        });
      }

      // Update kill switch
      const updateData = {
        enabled,
        reason: reason || null,
      };

      if (enabled && !killSwitch.enabled) {
        // Activating
        updateData.activatedAt = new Date();
        updateData.activatedBy = session.user.id;
        updateData.activatedByEmail = session.user.email;
        updateData.deactivatedAt = null;
        updateData.deactivatedBy = null;
        updateData.deactivatedByEmail = null;
      } else if (!enabled && killSwitch.enabled) {
        // Deactivating
        updateData.deactivatedAt = new Date();
        updateData.deactivatedBy = session.user.id;
        updateData.deactivatedByEmail = session.user.email;
      }

      const updated = await prisma.opsKillSwitch.update({
        where: { switchType },
        data: updateData,
      });

      // Log event
      await prisma.opsEvent.create({
        data: {
          eventType: 'KILL_SWITCH_CHANGED',
          severity: enabled ? 'WARN' : 'INFO',
          title: `Kill Switch ${enabled ? 'Activated' : 'Deactivated'}`,
          message: `Kill switch "${switchType}" ${enabled ? 'activated' : 'deactivated'}`,
          context: {
            switchType,
            enabled,
            reason,
          },
          resourceType: 'PLATFORM',
          userId: session.user.id,
          userEmail: session.user.email,
        },
      });

      return res.status(200).json({ data: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[api/admin/ops/kill-switch] Error:', error);

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
