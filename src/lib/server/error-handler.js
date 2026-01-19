/**
 * Centralized Error Handler for API Routes
 * Provides consistent error handling and logging
 */

/**
 * Handle API route error
 * @param {Error} error - The error object
 * @param {object} res - Next.js response object
 * @param {string} context - Context string for logging (e.g., 'api/dashboard/kpi')
 */
export function handleApiError(error, res, context = 'api/unknown') {
  // Log error with context
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
  });

  // Check if response already sent
  if (res.headersSent) {
    console.error(`[${context}] Response already sent, cannot send error response`);
    return;
  }

  // Handle Prisma errors specifically
  if (error.code && error.code.startsWith('P')) {
    console.error(`[${context}] Prisma Error:`, {
      code: error.code,
      message: error.message,
    });

    return res.status(500).json({
      errors: {
        error: {
          msg: 'Database error occurred. Please check the logs for details.',
        },
      },
    });
  }

  // Handle validation errors
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      errors: {
        error: {
          msg: error.message || 'Validation error',
        },
      },
    });
  }

  // Generic error response
  return res.status(500).json({
    errors: {
      error: {
        msg: error.message || 'Internal server error',
      },
    },
  });
}

/**
 * Wrapper for API route handlers with error handling
 * @param {Function} handler - The API route handler function
 * @param {string} context - Context string for logging
 * @returns {Function} Wrapped handler
 */
export function withErrorHandler(handler, context = 'api/unknown') {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, res, context);
    }
  };
}
