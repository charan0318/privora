const mongoose = require('mongoose');

const predictionEventSchema = new mongoose.Schema({
  // Event identification
  eventType: {
    type: String,
    required: true,
    enum: ['PredictionCreated', 'PredictionResolved', 'PositionPlaced', 'WinningsClaimed']
  },

  // Common fields
  predictionId: {
    type: String,
    required: true,
    index: true
  },

  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  blockNumber: {
    type: Number,
    required: true,
    index: true
  },

  logIndex: {
    type: Number,
    required: true
  },

  timestamp: {
    type: Date,
    required: true,
    index: true
  },

  processed: {
    type: Boolean,
    default: false,
    index: true
  },

  // PredictionCreated specific fields
  title: {
    type: String
  },

  topicId: {
    type: String
  },

  // PositionPlaced specific fields
  user: {
    type: String,
    index: true
  },

  optionIndex: {
    type: Number
  },

  shares: {
    type: Number
  },

  encryptedAmount: {
    type: String  // Store encrypted euint64 as string
  },

  actualAmount: {
    type: Number,  // Decrypted amount for statistics
    default: 0
  },

  // PredictionResolved specific fields
  winningOptionIndex: {
    type: Number
  },

  resolutionSource: {
    type: String
  },

  // WinningsClaimed specific fields
  claimAmount: {
    type: Number
  },

  // Additional metadata
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
predictionEventSchema.index({ predictionId: 1, eventType: 1 });
predictionEventSchema.index({ user: 1, timestamp: -1 });
predictionEventSchema.index({ blockNumber: 1 });
predictionEventSchema.index({ processed: 1 });

// Static method to get prediction statistics
predictionEventSchema.statics.getPredictionStatistics = async function(predictionId) {
  const stats = await this.aggregate([
    {
      $match: { predictionId: predictionId }
    },
    {
      $group: {
        _id: '$predictionId',
        totalVolume: { $sum: '$actualAmount' },
        totalPositions: { $sum: 1 },
        uniquePredictors: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        totalVolume: 1,
        totalPositions: 1,
        uniquePredictors: { $size: '$uniquePredictors' }
      }
    }
  ]);

  return stats[0] || { totalVolume: 0, totalPositions: 0, uniquePredictors: 0 };
};

module.exports = mongoose.model('PredictionEvent', predictionEventSchema);