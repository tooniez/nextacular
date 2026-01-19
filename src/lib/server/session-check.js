import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/server/auth';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';

function agentLog(hypothesisId, message, data) {
  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'session-check',
        hypothesisId,
        location: 'src/lib/server/session-check.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

const validateMiddleware = () => {
  return async (req, res, next) => {
    try {
      const session = await getServerSession(req, res, authOptions);
      const errors = [];

      if (!session) {
        const driverSession = getDriverSessionFromReq(req);
        // #region agent log
        agentLog('SCHK_401', 'validateSession unauthorized', {
          method: String(req?.method || ''),
          url: String(req?.url || '').slice(0, 200),
          hasNextAuthSession: false,
          hasDriverSession: Boolean(driverSession?.endUserId),
        });
        // #endregion
        const error = new Error('Unauthorized access');
        error.statusCode = 401;
        error.errors = { session: { param: 'session', msg: 'Unauthorized access' } };
        return next(error);
      } else {
        // #region agent log
        agentLog('SCHK_OK', 'validateSession ok', {
          method: String(req?.method || ''),
          url: String(req?.url || '').slice(0, 200),
          hasNextAuthSession: true,
        });
        // #endregion
        return next(session);
      }
    } catch (error) {
      const errorObject = {};
      errorObject['session'] = { param: 'session', msg: 'Internal error' };
      res.status(500).json({ errors: errorObject });
    }
  };
};

export default validateMiddleware;
