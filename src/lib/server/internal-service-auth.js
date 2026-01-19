/**
 * Internal Service Authentication
 * Validates requests from internal services (OCPP server, Hubject mock, etc.)
 * 
 * In production, this should verify Hubject API signatures.
 */

/**
 * Validate internal service request
 * Checks for X-Internal-Service header or API key
 * @param {object} req - Next.js request object
 * @returns {boolean} true if valid internal service request
 */
export function validateInternalService(req) {
  const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-ocpp-service-token';
  const headerToken = req.headers['x-internal-service'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (headerToken === internalServiceToken) {
    return true;
  }
  
  return false;
}
