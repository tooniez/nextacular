import { check } from 'express-validator';
import initMiddleware from '@/lib/server/init-middleware';
import validate from '@/lib/server/validate';

const rules = {
  create: [
    check('ocppId')
      .notEmpty()
      .withMessage('OCPP ID is required')
      .isLength({ min: 1, max: 64 })
      .withMessage('OCPP ID must be between 1 and 64 characters'),
    check('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    check('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Location must not exceed 200 characters'),
    check('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    check('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    check('ocppVersion')
      .optional()
      .isLength({ max: 20 })
      .withMessage('OCPP Version must not exceed 20 characters'),
  ],
  update: [
    check('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    check('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Location must not exceed 200 characters'),
    check('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    check('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    check('status')
      .optional()
      .isIn(['AVAILABLE', 'CHARGING', 'UNAVAILABLE', 'FAULTED', 'OFFLINE', 'PREPARING'])
      .withMessage('Invalid status'),
    check('ocppVersion')
      .optional()
      .isLength({ max: 20 })
      .withMessage('OCPP Version must not exceed 20 characters'),
  ],
  connector: {
    create: [
      check('connectorId')
        .notEmpty()
        .withMessage('Connector ID is required')
        .isInt({ min: 1 })
        .withMessage('Connector ID must be a positive integer'),
      check('name')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Name must not exceed 100 characters'),
      check('maxPower')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max power must be a positive number'),
      check('connectorType')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Connector type must not exceed 50 characters'),
    ],
    update: [
      check('name')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Name must not exceed 100 characters'),
      check('status')
        .optional()
        .isIn(['AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'FINISHING', 'RESERVED'])
        .withMessage('Invalid status'),
      check('maxPower')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max power must be a positive number'),
      check('connectorType')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Connector type must not exceed 50 characters'),
    ],
  },
};

export const validateCreateStation = initMiddleware(validate(rules.create));
export const validateUpdateStation = initMiddleware(validate(rules.update));
export const validateCreateConnector = initMiddleware(validate(rules.connector.create));
export const validateUpdateConnector = initMiddleware(validate(rules.connector.update));
