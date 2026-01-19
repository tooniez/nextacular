/**
 * API: Hubject CDR (Charge Detail Record)
 * Receives CDR from Hubject asynchronously for settlement
 * 
 * POST /api/roaming/hubject/cdr
 * Body: { hubjectSessionId, cdrData, clearingReference }
 */

import { validateInternalService } from '@/lib/server/internal-service-auth';
import { matchCdrWithSession } from '@/prisma/services/roamingHubject';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify internal service call (or Hubject signature in production)
    const isInternalService = validateInternalService(req);
    if (!isInternalService) {
      return res.status(401).json({
        errors: { auth: { msg: 'Unauthorized: Invalid service token' } },
      });
    }

    const { hubjectSessionId, cdrData, clearingReference } = req.body;

    if (!hubjectSessionId || !cdrData) {
      return res.status(400).json({
        errors: {
          hubjectSessionId: { msg: 'hubjectSessionId is required' },
          cdrData: { msg: 'cdrData is required' },
        },
      });
    }

    // Validate CDR data structure
    if (!cdrData.energyKwh && !cdrData.durationSeconds && !cdrData.grossAmount) {
      return res.status(400).json({
        errors: { cdrData: { msg: 'cdrData must contain at least energyKwh, durationSeconds, or grossAmount' } },
      });
    }

    // Match CDR with session
    const result = await matchCdrWithSession(hubjectSessionId, {
      ...cdrData,
      clearingReference: clearingReference || `CDR-${hubjectSessionId}-${Date.now()}`,
    });

    return res.status(200).json({
      data: {
        sessionId: result.session.id,
        matched: result.matched,
        clearingStatus: result.session.clearingStatus,
        matchResult: result.matchResult,
        ...(result.disputeReason && { disputeReason: result.disputeReason }),
      },
    });
  } catch (error) {
    console.error('[api/roaming/hubject/cdr] Error:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        errors: { session: { msg: error.message } },
      });
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
