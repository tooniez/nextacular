import { validateSession } from '@/config/api-validation';
import { verifyWorkspaceRole, PERMISSIONS } from '@/lib/server/require-workspace-role';
import { getPayoutStatement } from '@/prisma/services/payout';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    try {
      const session = await validateSession(req, res);
      const workspaceSlug = req.query.workspaceSlug || req.query.workspaceId;

      if (!workspaceSlug) {
        return res.status(400).json({
          errors: { workspaceSlug: { msg: 'Workspace slug or ID required' } },
        });
      }

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Statement ID required' } },
        });
      }

      const { workspaceId } = await verifyWorkspaceRole(session, workspaceSlug, PERMISSIONS.VIEW);

      const statement = await getPayoutStatement(id, workspaceId);

      if (!statement) {
        return res.status(404).json({
          errors: { statement: { msg: 'Payout statement not found' } },
        });
      }

      // Get sessions with roaming data for line items
      const sessionIds = statement.lineItems.map(item => item.sessionId);
      const sessions = await prisma.chargingSession.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          roamingType: true,
          clearingStatus: true,
          hubjectSessionId: true,
        },
      });

      const sessionMap = new Map(sessions.map(s => [s.id, s]));

      // Generate CSV
      const csvLines = [];
      
      // Header
      csvLines.push([
        'Statement ID',
        'Period Start',
        'Period End',
        'Session ID',
        'Station OCPP ID',
        'Station Name',
        'Started At',
        'Ended At',
        'Energy (kWh)',
        'Gross Amount',
        'MS Fee Amount',
        'Sub-CPO Earning',
        'Currency',
        'Roaming Type',
        'Clearing Status',
        'Hubject Session ID',
      ].join(','));

      // Statement summary line
      csvLines.push([
        statement.id,
        statement.periodStart.toISOString(),
        statement.periodEnd.toISOString(),
        'SUMMARY',
        '',
        '',
        '',
        '',
        statement.totalEnergyKwh.toFixed(2),
        statement.totalGrossAmount.toFixed(2),
        statement.totalMsFeeAmount.toFixed(2),
        statement.totalSubCpoEarning.toFixed(2),
        statement.currency,
        '', // Roaming Type (summary)
        '', // Clearing Status (summary)
        '', // Hubject Session ID (summary)
      ].join(','));

      // Line items
      for (const item of statement.lineItems) {
        csvLines.push([
          statement.id,
          statement.periodStart.toISOString(),
          statement.periodEnd.toISOString(),
          item.sessionId,
          '', // Station OCPP ID (would need join)
          item.stationName,
          item.sessionStartTime.toISOString(),
          '', // Ended At (would need join to session)
          item.energyKwh.toFixed(2),
          item.grossAmount.toFixed(2),
          item.msFeeAmount.toFixed(2),
          item.subCpoEarning.toFixed(2),
          item.currency,
        ].join(','));
      }

      const csv = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payout-${statement.id}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      console.error('[api/payouts/[id]/export.csv] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          errors: { error: { msg: error.message || 'Failed to export CSV' } },
        });
      }
    }
  } else {
    res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }
};

export default handler;
