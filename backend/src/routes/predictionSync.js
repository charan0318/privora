const express = require('express');
const router = express.Router();
const predictionSyncController = require('../controllers/predictionSyncController');
const upload = require('../middleware/upload');

// Sync predictions from contract
router.post('/sync', predictionSyncController.syncPredictionsFromContract);

// Get all predictions
router.get('/', predictionSyncController.getAllPredictions);

// Get prediction by contractId
router.get('/:contractId', predictionSyncController.getPredictionByContractId);

// Update prediction topic
router.put('/:contractId/topic', predictionSyncController.updatePredictionTopic);

// Update prediction image (URL)
router.put('/:contractId/image', predictionSyncController.updatePredictionImage);

// Upload prediction image (File Upload)
router.post('/:contractId/upload-image', upload.single('image'), predictionSyncController.uploadPredictionImage);

// Resolve prediction (admin only)
router.post('/:contractId/resolve', predictionSyncController.resolvePrediction);

// Resolve nested prediction (admin only)
router.post('/:contractId/resolve-nested', predictionSyncController.resolveNestedPrediction);

// Get predictions by topic
router.get('/topic/:topicId', predictionSyncController.getPredictionsByTopic);

module.exports = router;