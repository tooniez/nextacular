import { check } from 'express-validator';
import initMiddleware from '@/lib/server/init-middleware';
import validate from '@/lib/server/validate';

const rules = {
  create: [
    check('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    check('basePricePerKwh')
      .notEmpty()
      .withMessage('Base price per kWh is required')
      .isFloat({ min: 0 })
      .withMessage('Base price per kWh must be a positive number'),
    check('pricePerMinute')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per minute must be a positive number'),
    check('sessionStartFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Session start fee must be a positive number'),
    check('currency')
      .optional()
      .isLength({ max: 3 })
      .withMessage('Currency must be 3 characters (ISO code)')
      .default('EUR'),
    check('msFeePercent')
      .notEmpty()
      .withMessage('MS fee percentage is required')
      .isFloat({ min: 0, max: 1 })
      .withMessage('MS fee percentage must be between 0 and 1 (e.g., 0.15 = 15%)'),
    check('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    check('validFrom')
      .optional()
      .isISO8601()
      .withMessage('validFrom must be a valid ISO 8601 date'),
    check('validUntil')
      .optional()
      .isISO8601()
      .withMessage('validUntil must be a valid ISO 8601 date'),
  ],
  update: [
    check('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    check('basePricePerKwh')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Base price per kWh must be a positive number'),
    check('pricePerMinute')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per minute must be a positive number'),
    check('sessionStartFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Session start fee must be a positive number'),
    check('currency')
      .optional()
      .isLength({ max: 3 })
      .withMessage('Currency must be 3 characters (ISO code)'),
    check('msFeePercent')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('MS fee percentage must be between 0 and 1 (e.g., 0.15 = 15%)'),
    check('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    check('validFrom')
      .optional()
      .isISO8601()
      .withMessage('validFrom must be a valid ISO 8601 date'),
    check('validUntil')
      .optional()
      .isISO8601()
      .withMessage('validUntil must be a valid ISO 8601 date'),
  ],
  assignment: [
    check('tariffId')
      .notEmpty()
      .withMessage('Tariff ID is required'),
    check('validFrom')
      .optional()
      .isISO8601()
      .withMessage('validFrom must be a valid ISO 8601 date'),
    check('validUntil')
      .optional()
      .isISO8601()
      .withMessage('validUntil must be a valid ISO 8601 date'),
  ],
};

export const validateCreateTariff = initMiddleware(validate(rules.create));
export const validateUpdateTariff = initMiddleware(validate(rules.update));
export const validateTariffAssignment = initMiddleware(validate(rules.assignment));
