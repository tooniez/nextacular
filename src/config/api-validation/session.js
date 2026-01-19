import initMiddleware from '@/lib/server/init-middleware';
import validateMiddleware from '@/lib/server/session-check';

const validateSession = async (req, res) => {
  try {
    const session = await initMiddleware(validateMiddleware())(req, res);
    return session;
  } catch (error) {
    // If error has statusCode and errors, send appropriate response
    if (error.statusCode && error.errors) {
      if (!res.headersSent) {
        res.status(error.statusCode).json({ errors: error.errors });
      }
      // Create a special error that signals "response already sent"
      const responseError = new Error('Unauthorized');
      responseError.statusCode = error.statusCode;
      responseError.responseSent = true;
      throw responseError;
    }
    // Otherwise, send generic error
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ 
        errors: { session: { param: 'session', msg: error.message || 'Internal error' } } 
      });
    }
    throw error;
  }
};

export default validateSession;
