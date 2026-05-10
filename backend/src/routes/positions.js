const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Prediction = require('../models/Prediction');

/**
 * @route   POST /api/positions/record-position
 * @desc    Record user position (called from frontend after PlacePosition tx)
 * @access  Public
 */
router.post('/record-position', async (req, res) => {
  try {
    const {
      contractPredictionId,
      userAddress,
      optionIndex,
      outcome, // For nested predictions: 0=Yes, 1=No. For binary/multiple: null
      amount, // Cleartext amount from frontend
      entryPrice,
      placePositionTxHash,
      blockNumber
    } = req.body;

    // Validation
    if (!contractPredictionId || !userAddress || optionIndex === undefined || !amount || !placePositionTxHash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if already recorded (prevent duplicates)
    const existing = await Position.findOne({ placePositionTxHash });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Position already recorded',
        position: existing
      });
    }

    // Find prediction in MongoDB (REQUIRED for predictionId reference)
    const prediction = await Prediction.findOne({ contractId: contractPredictionId });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: `Prediction with contractId ${contractPredictionId} not found in database. Please sync predictions first.`
      });
    }

    // Create user position
    const userPosition = new Position({
      predictionId: prediction._id, // Required field
      contractPredictionId,
      userAddress: userAddress.toLowerCase(),
      optionIndex,
      outcome: outcome !== undefined ? outcome : null, // For nested: 0=Yes, 1=No. For binary/multiple: null
      amount, // Store cleartext amount
      entryPrice: entryPrice || 50, // Default 50 if not provided
      encryptedAmount: 'encrypted', // Placeholder (actual encrypted data on-chain)
      placePositionTxHash,
      blockNumber: blockNumber || 0,
      isEncrypted: true,
      status: 'active'
    });

    await userPosition.save();

    res.status(201).json({
      success: true,
      message: 'User position recorded successfully',
      position: userPosition
    });
  } catch (error) {
    console.error('Error recording user position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record user position',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/positions/:address/:contractPredictionId
 * @desc    Get user position for a specific prediction (check if user won)
 * @access  Public
 */
router.get('/:address/:contractPredictionId', async (req, res) => {
  try {
    const { address, contractPredictionId } = req.params;

    const position = await Position.findOne({
      userAddress: address.toLowerCase(),
      contractPredictionId: parseInt(contractPredictionId)
    });

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found',
        hasPosition: false
      });
    }

    res.json({
      success: true,
      hasPosition: true,
      isResolved: position.isResolved,
      isWinner: position.isWinner,
      optionIndex: position.optionIndex,
      amount: position.amount,
      claimed: position.claimed
    });
  } catch (error) {
    console.error('Error fetching user position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user position',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/positions/update-winners
 * @desc    Update winners after prediction resolution (called by admin/backend)
 * @access  Public (should be protected in production)
 */
router.post('/update-winners', async (req, res) => {
  try {
    const { contractPredictionId, winningOptionIndex, winningOutcome } = req.body;

    if (!contractPredictionId || winningOptionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing contractPredictionId or winningOptionIndex'
      });
    }

    // Find all positions for this prediction
    const positions = await Position.find({ contractPredictionId });

    if (positions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No positions found for this prediction'
      });
    }

    const isNestedPrediction = winningOutcome !== undefined && winningOutcome !== null;

    // Update each position
    const updates = positions.map(async (position) => {
      position.isResolved = true;

      // For nested predictions: check both optionIndex AND outcome
      // For binary/multiple: check only optionIndex
      if (isNestedPrediction) {
        position.isWinner = (
          position.optionIndex === winningOptionIndex &&
          position.outcome === winningOutcome
        );
      } else {
        position.isWinner = position.optionIndex === winningOptionIndex;
      }

      position.status = 'resolved';
      await position.save();
    });

    await Promise.all(updates);

    const winnersCount = positions.filter(p => {
      if (isNestedPrediction) {
        return p.optionIndex === winningOptionIndex && p.outcome === winningOutcome;
      }
      return p.optionIndex === winningOptionIndex;
    }).length;

    res.json({
      success: true,
      message: `Updated ${positions.length} positions`,
      winnersCount: winnersCount,
      losersCount: positions.length - winnersCount,
      isNestedPrediction: isNestedPrediction
    });
  } catch (error) {
    console.error('Error updating winners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update winners',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/positions/user/:address
 * @desc    Get all positions for a user
 * @access  Public
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { status } = req.query; // Optional filter

    const query = { userAddress: address.toLowerCase() };
    if (status) query.status = status;

    const positions = await Position.find(query)
      .populate('predictionId', 'title description endTime isResolved')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: positions.length,
      positions
    });
  } catch (error) {
    console.error('Error fetching user positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user positions',
      error: error.message
    });
  }
});

module.exports = router;