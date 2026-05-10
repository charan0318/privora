const { body, param, query, validationResult } = require('express-validator');
const Prediction = require('../models/Prediction');
const Position = require('../models/Position');
const Topic = require('../models/Topic');
const { ethers } = require('ethers');

// Helper function to check validation results
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation failed:', errors.array());
    console.log('📝 Request body:', req.body);
    console.log('📝 Request params:', req.params);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation for placing a position
const validatePlacePosition = [
  param('id')
    .isMongoId()
    .withMessage('Invalid prediction ID format'),

  body('optionIndex')
    .isInt({ min: 0 })
    .withMessage('Option index must be a non-negative integer'),

  body('amount')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Amount must be between 0.01 and 100,000'),

  body('txHash')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),

  body('userAddress')
    .custom(value => {
      if (!value || !ethers.isAddress(value)) {
        throw new Error('Valid user wallet address is required');
      }
      return true;
    }),

  // FHEVM encrypted data validation (optional)
  body('isFHEVMEncrypted')
    .optional()
    .isBoolean()
    .withMessage('isFHEVMEncrypted must be a boolean'),

  body('encryptedAmount')
    .optional()
    .matches(/^0x[a-fA-F0-9]+$/)
    .withMessage('Invalid encrypted amount format'),

  body('encryptedProof')
    .optional()
    .matches(/^0x[a-fA-F0-9]+$/)
    .withMessage('Invalid encrypted proof format'),

  body('fhevmHandles')
    .optional()
    .isArray()
    .withMessage('FHEVM handles must be an array'),

  body('fhevmInputProof')
    .optional()
    .matches(/^0x[a-fA-F0-9]+$/)
    .withMessage('Invalid FHEVM input proof format'),

  body('contractAddress')
    .optional()
    .custom(value => {
      if (value && !ethers.isAddress(value)) {
        throw new Error('Invalid contract address format');
      }
      return true;
    }),

  // Custom validation for prediction constraints
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { optionIndex, amount, userAddress } = req.body;

      // Check if prediction exists and is valid
      const prediction = await Prediction.findById(id);
      if (!prediction) {
        return res.status(404).json({
          success: false,
          message: 'Prediction not found'
        });
      }

      // Check if prediction is active
      if (!prediction.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This prediction is no longer active'
        });
      }

      // Check if prediction is resolved
      if (prediction.isResolved) {
        return res.status(400).json({
          success: false,
          message: 'This prediction has already been resolved'
        });
      }

      // Check if prediction has ended
      if (new Date() > prediction.endTime) {
        return res.status(400).json({
          success: false,
          message: 'Positioning period has ended'
        });
      }

      // Validate option index
      if (optionIndex >= prediction.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid option selected'
        });
      }

      // Check positioning limits
      if (amount < prediction.minPositionAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum position amount is ${prediction.minPositionAmount / 1000000} USDC`
        });
      }

      if (amount > prediction.maxPositionAmount) {
        return res.status(400).json({
          success: false,
          message: `Maximum position amount is ${prediction.maxPositionAmount / 1000000} USDC`
        });
      }

      // Check for duplicate transaction hash
      const existingPosition = await Position.findOne({
        placePositionTxHash: req.body.txHash
      });

      if (existingPosition) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash already used'
        });
      }

      // Check user's total positions on this prediction (prevent excessive positioning)
      // TODO: Implement Position-based user total positioning check
      // const userTotalPositions = await Position.aggregate([
      //   { $match: { predictionId: prediction._id, userAddress: userAddress.toLowerCase() } },
      //   { $group: { _id: null, total: { $sum: '$amount' } } }
      // ]);

      // const maxUserTotal = prediction.maxPositionAmount * 10; // User can position up to 10x max single position
      // if (userTotalPositions.total + amount > maxUserTotal) {
      //   return res.status(400).json({
      //     success: false,
      //     message: `Total positioning limit exceeded. Maximum total: ${maxUserTotal} ETH`
      //   });
      // }

      next();
    } catch (error) {
      next(error);
    }
  },

  checkValidationResult
];

// Validation for creating a prediction
const validateCreatePrediction = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),

  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('topicId')
    .notEmpty()
    .withMessage('Topic is required'),

  body('endTime')
    .isISO8601()
    .withMessage('Invalid end time format')
    .custom((value) => {
      const endTime = new Date(value);
      const now = new Date();
      const minFuture = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const maxFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      if (endTime <= minFuture) {
        throw new Error('End time must be at least 1 hour in the future');
      }

      if (endTime > maxFuture) {
        throw new Error('End time cannot be more than 1 year in the future');
      }

      return true;
    }),

  body('predictionType')
    .isInt({ min: 1, max: 3 })
    .withMessage('Prediction type must be 1 (Multiple Choice), 2 (Binary), or 3 (Sports)'),

  body('options')
    .isArray({ min: 2, max: 10 })
    .withMessage('Must have between 2 and 10 options'),

  body('options.*.title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Option title must be between 2 and 200 characters'),

  body('minPositionAmount')
    .optional()
    .isFloat({ min: 0.01, max: 1000 })
    .withMessage('Minimum position amount must be between 0.01 and 1000'),

  body('maxPositionAmount')
    .optional()
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Maximum position amount must be between 1 and 100,000'),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  // Custom validation for prediction type specific rules
  body().custom((body) => {
    const { predictionType, options } = body;

    // Binary predictions must have exactly 2 options
    if (predictionType === 2 && options?.length !== 2) {
      throw new Error('Binary predictions must have exactly 2 options');
    }

    // Sports predictions must have exactly 3 options
    if (predictionType === 3 && options?.length !== 3) {
      throw new Error('Sports predictions must have exactly 3 options (Home/Draw/Away)');
    }

    // Check for duplicate option titles
    if (options) {
      const titles = options.map(opt => opt.title.toLowerCase());
      const uniqueTitles = new Set(titles);
      if (titles.length !== uniqueTitles.size) {
        throw new Error('Option titles must be unique');
      }
    }

    return true;
  }),

  // Validate topic exists
  async (req, res, next) => {
    try {
      const { topicId } = req.body;
      const topic = await Topic.findById(topicId);

      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'Invalid topic selected'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  },

  checkValidationResult
];

// Validation for resolving a prediction
const validateResolvePrediction = [
  param('id')
    .isMongoId()
    .withMessage('Invalid prediction ID format'),

  body('winningOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Winning option index must be a non-negative integer'),

  body('resolutionSource')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Resolution source must be between 5 and 500 characters'),

  body('txHash')
    .optional()
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),

  // Custom validation for resolution constraints
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { winningOptionIndex } = req.body;

      const prediction = await Prediction.findById(id);
      if (!prediction) {
        return res.status(404).json({
          success: false,
          message: 'Prediction not found'
        });
      }

      if (prediction.isResolved) {
        return res.status(400).json({
          success: false,
          message: 'Prediction is already resolved'
        });
      }

      if (winningOptionIndex >= prediction.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid winning option index'
        });
      }

      // Check if prediction has ended (optional, admin can resolve early)
      if (new Date() < prediction.endTime) {
        // Allow early resolution but log it
        console.log(`⚠️  Early resolution for prediction ${id} by admin`);
      }

      next();
    } catch (error) {
      next(error);
    }
  },

  checkValidationResult
];

// Validation for claiming winnings
const validateClaimWinnings = [
  param('id')
    .isMongoId()
    .withMessage('Invalid prediction ID format'),

  body('txHash')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),

  body('userAddress')
    .custom(value => {
      if (!value || !ethers.isAddress(value)) {
        throw new Error('Valid user wallet address is required');
      }
      return true;
    }),

  // Custom validation for claim constraints
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { txHash, userAddress } = req.body;

      const prediction = await Prediction.findById(id);
      if (!prediction) {
        return res.status(404).json({
          success: false,
          message: 'Prediction not found'
        });
      }

      if (!prediction.isResolved) {
        return res.status(400).json({
          success: false,
          message: 'Prediction is not resolved yet'
        });
      }

      // Check if user has winning positions using Position model
      const userPositions = await Position.find({
        predictionId: prediction._id,
        userAddress: userAddress.toLowerCase(),
        optionIndex: prediction.winningOptionIndex
      });

      if (userPositions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No winning positions found for this user'
        });
      }

      // Check if already claimed
      const alreadyClaimed = userPositions.some(up => up.claimed);
      if (alreadyClaimed) {
        return res.status(400).json({
          success: false,
          message: 'Winnings already claimed'
        });
      }

      // Check for duplicate claim transaction
      const existingClaim = await Position.findOne({
        claimTxHash: txHash
      });

      if (existingClaim) {
        return res.status(400).json({
          success: false,
          message: 'Claim transaction hash already used'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  },

  checkValidationResult
];

// Validation for updating a prediction
const validateUpdatePrediction = [
  param('id')
    .isMongoId()
    .withMessage('Invalid prediction ID format'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  // Custom validation to prevent updating resolved predictions
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const prediction = await Prediction.findById(id);
      if (!prediction) {
        return res.status(404).json({
          success: false,
          message: 'Prediction not found'
        });
      }

      if (prediction.isResolved) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update resolved prediction'
        });
      }

      // Prevent updating certain fields if prediction has active participants
      const positionCount = await Position.countDocuments({ predictionId: prediction._id });
      if (positionCount > 0) {
        const restrictedFields = ['options', 'predictionType', 'endTime', 'minPositionAmount', 'maxPositionAmount'];
        const hasRestrictedUpdates = restrictedFields.some(field => req.body[field] !== undefined);

        if (hasRestrictedUpdates) {
          return res.status(400).json({
            success: false,
            message: 'Cannot update prediction structure after participants have placed positions'
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  },

  checkValidationResult
];

// Query validation for getting predictions
const validateGetPredictions = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('filter')
    .optional()
    .isIn(['all', 'trending', 'new', 'ending-soon', 'volume'])
    .withMessage('Invalid filter option'),

  query('status')
    .optional()
    .isIn(['active', 'resolved', 'ended', 'all'])
    .withMessage('Invalid status option'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),

  query('topicId')
    .optional()
    .notEmpty()
    .withMessage('Topic ID cannot be empty'),

  checkValidationResult
];

// Validation for FHEVM specific operations
const validateFHEVMOperation = [
  body('encryptedAmount')
    .optional()
    .isString()
    .withMessage('Encrypted amount must be a string'),

  body('proof')
    .optional()
    .isString()
    .withMessage('Proof must be a string'),

  body('publicKey')
    .optional()
    .isString()
    .withMessage('Public key must be a string'),

  // Custom FHEVM validation
  (req, res, next) => {
    const { encryptedAmount, proof, publicKey } = req.body;

    // If FHEVM fields are provided, validate them
    if (encryptedAmount || proof || publicKey) {
      if (!encryptedAmount || !proof) {
        return res.status(400).json({
          success: false,
          message: 'Both encrypted amount and proof are required for FHEVM operations'
        });
      }
    }

    next();
  },

  checkValidationResult
];

// Wallet address validation
const validateWalletAddress = (field) => [
  body(field)
    .custom((value) => {
      if (!ethers.isAddress(value)) {
        throw new Error('Invalid Ethereum address');
      }
      return true;
    }),
];

module.exports = {
  validatePlacePosition,
  validateCreatePrediction,
  validateResolvePrediction,
  validateClaimWinnings,
  validateUpdatePrediction,
  validateGetPredictions,
  validateFHEVMOperation,
  validateWalletAddress,
};