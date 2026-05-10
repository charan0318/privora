const express = require('express');
const {
  getTopics,
  getTopic,
  getTopLevelTopics,
  getSubTopics,
  getTopicTree,
  getTopicPath,
  searchTopics,
} = require('../controllers/topicController');
const { optionalAuth } = require('../middleware/auth');
const {
  validateMongoId,
  validateSearch,
  validatePagination,
  sanitizeInput,
} = require('../middleware/validation');

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);
router.use(sanitizeInput);

// Public topic routes
router.get('/', validatePagination, getTopics);
router.get('/top-level', getTopLevelTopics);
router.get('/tree', getTopicTree);
router.get('/search', validateSearch, searchTopics);

// Topic by ID routes
router.get('/:id', validateMongoId, getTopic);
router.get('/:id/path', validateMongoId, getTopicPath);

// Parent-child relationship routes
router.get('/:parentId/children', validateMongoId, getSubTopics);

module.exports = router;