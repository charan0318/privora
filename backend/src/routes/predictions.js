const express = require('express');
const {
  getPredictions,
  getPrediction,
  searchPredictions,
  getPredictionsByTopic,
  submitPosition,
  claimWinnings,
  getUserPositions,
  getPredictionMarketData,
  simulatePrediction,
  getPredictionStatistics,
} = require('../controllers/predictionController');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  validateMongoId,
  validateWalletAddress,
  validateSearch,
  validatePagination,
  sanitizeInput,
} = require('../middleware/validation');
const {
  validatePlacePosition,
  validateClaimWinnings,
  validateGetPredictions,
  validateFHEVMOperation,
} = require('../middleware/predictionValidation');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// Apply optional auth to read routes that might benefit from user context
const readRoutes = express.Router();
readRoutes.use(optionalAuth);

// Debug route
router.get('/debug', (req, res) => {
  console.log('🐛 DEBUG ROUTE HIT');
  res.json({ message: 'Debug route working' });
});

// Public prediction routes
router.get('/', getPredictions);
router.get('/search', validateSearch, searchPredictions);

// Topic-specific predictions
router.get('/topic/:topicId', validatePagination, getPredictionsByTopic);

// User-specific predictions
router.get('/user/:address', validateWalletAddress, validatePagination, getUserPositions);
router.get('/user/:address/stats', validateWalletAddress, require('../controllers/predictionController').getUserPredictionStats);

// Create prediction ID validator that accepts both numeric IDs and MongoDB ObjectIds
const { param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validatePredictionId = [
  param('id')
    .custom((value) => {
      // Allow numeric IDs (contract IDs like 1, 2, 3)
      if (/^\d+$/.test(value)) {
        return true;
      }
      // Allow MongoDB ObjectIds (24 character hex strings)
      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }
      throw new Error('Valid prediction ID is required');
    })
    .withMessage('Valid prediction ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    next();
  }
];

// Debug route must come before /:id route
// Single prediction routes
router.get('/:id', validatePredictionId, getPrediction);

// Public market data routes (no auth required)
router.get('/:id/market', validatePredictionId, getPredictionMarketData);
router.get('/:id/statistics', validatePredictionId, getPredictionStatistics);
router.post('/:id/simulate', validatePredictionId, simulatePrediction);

// Protected routes (require authentication)
// Development mode: Skip auth for prediction actions
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode: Skipping auth for prediction actions');
  // Prediction actions without auth in development
  router.post('/:id/position', validatePlacePosition, validateFHEVMOperation, submitPosition);
  router.post('/:id/claim', validateClaimWinnings, claimWinnings);
} else {
  // Production mode: Require auth
  router.post('/:id/position', protect, validatePlacePosition, validateFHEVMOperation, submitPosition);
  router.post('/:id/claim', protect, validateClaimWinnings, claimWinnings);
}

module.exports = router;