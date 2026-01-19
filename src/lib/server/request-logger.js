/**
 * Request logger utility for structured logging
 * Generates requestId, logs request/response with timing
 */

/**
 * Generate unique request ID
 */
function generateRequestId() {
  // Use crypto.randomUUID if available (Node.js 14.17.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate or get request ID from request headers
 */
export function getRequestId(req) {
  if (req.headers['x-request-id']) {
    return req.headers['x-request-id'];
  }
  const requestId = generateRequestId();
  req.headers['x-request-id'] = requestId;
  return requestId;
}

/**
 * Sanitize query params for logging (remove sensitive data)
 */
export function sanitizeQuery(query) {
  const sanitized = { ...query };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;
  delete sanitized.secret;
  // Truncate long values
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
      sanitized[key] = sanitized[key].substring(0, 100) + '...';
    }
  });
  return sanitized;
}

/**
 * Log request start
 */
export function logRequestStart(req, endpoint) {
  const requestId = getRequestId(req);
  const startTime = Date.now();
  req._requestStartTime = startTime;
  req._requestId = requestId;
  
  const logData = {
    requestId,
    endpoint,
    method: req.method,
    url: req.url,
    query: sanitizeQuery(req.query),
    timestamp: startTime,
  };
  
  if (process.env.DEBUG_SESSIONS === '1' || process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] ${req.method} ${endpoint}`, logData);
  }
  
  return { requestId, startTime };
}

/**
 * Log request success
 */
export function logRequestSuccess(req, endpoint, data = {}) {
  const requestId = req._requestId || getRequestId(req);
  const startTime = req._requestStartTime || Date.now();
  const duration = Date.now() - startTime;
  
  const logData = {
    requestId,
    endpoint,
    method: req.method,
    duration: `${duration}ms`,
    statusCode: 200,
    timestamp: Date.now(),
    ...data,
  };
  
  if (process.env.DEBUG_SESSIONS === '1' || process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] ${req.method} ${endpoint} SUCCESS`, logData);
  }
  
  return { requestId, duration };
}

/**
 * Log request error
 */
export function logRequestError(req, endpoint, error, statusCode = 500) {
  const requestId = req._requestId || getRequestId(req);
  const startTime = req._requestStartTime || Date.now();
  const duration = Date.now() - startTime;
  
  const logData = {
    requestId,
    endpoint,
    method: req.method,
    duration: `${duration}ms`,
    statusCode,
    error: {
      name: error.name,
      message: error.message?.substring(0, 500),
      stack: process.env.DEBUG_SESSIONS === '1' ? error.stack?.substring(0, 2000) : undefined,
      code: error.code,
    },
    timestamp: Date.now(),
  };
  
  console.error(`[${requestId}] ${req.method} ${endpoint} ERROR`, logData);
  
  return { requestId, duration, error: logData.error };
}
