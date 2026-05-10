const { body, param, validationResult } = require('express-validator');

// Helper function to check validation results
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation for creating a bet
const validateCreateBet = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),

  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required'),

  body('options')
    .isArray({ min: 2 })
    .withMessage('At least 2 options are required'),

  checkValidationResult
];

// Validation for resolving a bet
const validateResolveBet = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bet ID'),

  body('winningOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Winning option index must be a non-negative integer'),

  body('resolutionSource')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Resolution source must be at most 500 characters'),

  checkValidationResult
];

// Validation for updating a bet
const validateUpdateBet = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bet ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  checkValidationResult
];

// Validation for getting bets
const validateGetBets = [
  param('id')
    .optional()
    .isMongoId()
    .withMessage('Invalid bet ID'),

  checkValidationResult
];

module.exports = {
  validateCreateBet,
  validateResolveBet,
  validateUpdateBet,
  validateGetBets,
};