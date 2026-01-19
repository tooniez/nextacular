/**
 * API: Hubject Outbound StartSession
 * Creates an OUTBOUND roaming session when MSolution driver starts charging on external station
 * 
 * POST /api/roaming/hubject/outbound/start
 * Body: { hubjectSessionId, endUserId, cpoId, rfidToken, estimatedAmountEur, stationInfo }
 */

import { validateInternalService } from '@/lib/server/internal-service-auth';
import { createOutboundSession } from '@/prisma/services/roamingHubject';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify internal service call
    const isInternalService = validateInternalService(req);
    if (!isInternalService) {
      return res.status(401).json({
        errors: { auth: { msg: 'Unauthorized: Invalid service token' } },
      });
    }

    const {
      hubjectSessionId,
      endUserId,
      cpoId,
      rfidToken,
      estimatedAmountEur,
      stationInfo,
      workspaceId,
    } = req.body;

    if (!hubjectSessionId || !endUserId || !cpoId) {
      return res.status(400).json({
        errors: {
          hubjectSessionId: { msg: 'hubjectSessionId is required' },
          endUserId: { msg: 'endUserId is required' },
          cpoId: { msg: 'cpoId is required' },
        },
      });
    }

    // Get workspace from endUser or use provided workspaceId
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId) {
      // For OUTBOUND, workspace is typically the MSolution workspace
      // In production, this might be determined by business logic
      const workspace = await prisma.workspace.findFirst({
        where: { slug: 'demo-subcpo' }, // Default for now
      });
      if (!workspace) {
        return res.status(400).json({
          errors: { workspace: { msg: 'Workspace not found' } },
        });
      }
      finalWorkspaceId = workspace.id;
    }

    // Create OUTBOUND session
    const session = await createOutboundSession({
      workspaceId: finalWorkspaceId,
      endUserId,
      hubjectSessionId,
      cpoId,
      rfidToken,
      stationInfo,
      estimatedAmountEur,
      timestamp: new Date(),
      stationId: 'virtual-outbound', // Virtual station for outbound tracking
      connectorId: 'virtual-outbound-1',
    });

    return res.status(201).json({
      data: {
        sessionId: session.id,
        hubjectSessionId: session.hubjectSessionId,
        roamingType: session.roamingType,
        status: session.status,
        paymentStatus: session.paymentStatus,
        stripePaymentIntentId: session.stripePaymentIntentId,
      },
    });
  } catch (error) {
    console.error('[api/roaming/hubject/outbound/start] Error:', error);
    
    // Handle idempotency
    if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
      try {
        const existing = await prisma.chargingSession.findUnique({
          where: { hubjectSessionId: req.body.hubjectSessionId },
        });
        if (existing) {
          return res.status(200).json({
            data: {
              sessionId: existing.id,
              hubjectSessionId: existing.hubjectSessionId,
              roamingType: existing.roamingType,
              status: existing.status,
              alreadyExists: true,
            },
          });
        }
      } catch (e) {
        // Fall through
      }
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
