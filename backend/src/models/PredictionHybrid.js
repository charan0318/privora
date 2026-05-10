const mongoose = require('mongoose');

// FHEVM Hybrid Prediction Option Schema
const predictionOptionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    description: 'Option title - editable by admin'
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
    description: 'Option description - editable by admin'
  },
  currentPrice: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
    description: 'Current market price for display'
  },
  isWinner: {
    type: Boolean,
    default: false,
    description: 'Winner status - synced from contract'
  },
  // FHEVM aggregated data
  encryptedTotalAmount: {
    type: String,
    default: null,
    description: 'FHEVM encrypted total position amount for this option'
  },
  publicTotalShares: {
    type: Number,
    default: 0,
    description: 'Public total shares for this option'
  },
  yesShares: {
    type: Number,
    default: 0,
    description: 'YES shares for nested predictions'
  },
  noShares: {
    type: Number,
    default: 0,
    description: 'NO shares for nested predictions'
  }
});

// FHEVM Hybrid Prediction Model - Contract state + Presentation data
const predictionHybridSchema = new mongoose.Schema({
  // ===== CONTRACT REFERENCE (IMMUTABLE) =====
  contractId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    description: 'Contract prediction ID - immutable identifier'
  },
  contractAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-f0-9]{40}$/i, 'Invalid contract address']
  },

  // ===== PRESENTATION DATA (MUTABLE - DATABASE ONLY) =====
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: 'text',
    description: 'Prediction title - editable by admin'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
    index: 'text',
    description: 'Prediction description - editable by admin'
  },
  imageUrl: {
    type: String,
    default: '',
    description: 'Image URL - editable by admin'
  },
  topicId: {
    type: String,
    ref: 'Topic',
    required: true,
    index: true,
    description: 'Topic - editable by admin'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  featured: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Featured flag - editable by admin'
  },
  priority: {
    type: Number,
    default: 0,
    description: 'Display priority - editable by admin'
  },
  visibility: {
    type: String,
    enum: ['public', 'hidden', 'featured'],
    default: 'public',
    index: true,
    description: 'Visibility setting - editable by admin'
  },

  // ===== GROUPING SYSTEM FOR NESTED PREDICTIONS =====
  predictionGroup: {
    groupId: {
      type: String,
      default: null,
      index: true,
      description: 'Group ID for related predictions (e.g., "fed_oct_2024")'
    },
    groupTitle: {
      type: String,
      default: null,
      description: 'Group display title (e.g., "Fed Decision October")'
    },
    groupType: {
      type: String,
      enum: ['nested', 'series', 'tournament', 'standalone'],
      default: 'standalone',
      description: 'Type of grouping: nested (Fed Decision), series (Weekly matches), tournament, standalone'
    },
    groupOrder: {
      type: Number,
      default: 0,
      description: 'Display order within the group'
    },
    isGroupHeader: {
      type: Boolean,
      default: false,
      description: 'Whether this prediction is the main/header prediction of the group'
    }
  },

  // ===== CONTRACT STATE MIRROR (SYNCED FROM BLOCKCHAIN) =====
  endTime: {
    type: Date,
    required: true,
    index: true,
    description: 'End time - synced from contract (immutable)'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Active status - synced from contract'
  },
  isResolved: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Resolved status - synced from contract'
  },
  predictionType: {
    type: Number,
    required: true,
    enum: [0, 1, 2], // BINARY, MULTIPLE_CHOICE, NESTED
    description: 'Prediction type - synced from contract (immutable)'
  },
  createdAt: {
    type: Date,
    required: true,
    description: 'Creation timestamp - synced from contract (immutable)'
  },
  createdBy: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-f0-9]{40}$/i, 'Invalid address'],
    description: 'Creator address - synced from contract (immutable)'
  },
  totalParticipants: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total participants - synced from contract'
  },
  minPositionAmount: {
    type: Number,
    required: true,
    min: 0,
    description: 'Min position amount - synced from contract (immutable)'
  },
  maxPositionAmount: {
    type: Number,
    required: true,
    min: 0,
    description: 'Max position amount - synced from contract (immutable)'
  },
  liquidityParam: {
    type: Number,
    default: 100,
    description: 'Liquidity parameter for parimutuel calculation'
  },

  // Prediction options
  options: [predictionOptionSchema],

  // ===== FHEVM HYBRID STATISTICS =====
  encryptedTotalVolume: {
    type: String,
    default: null,
    description: 'FHEVM encrypted total position volume across all options'
  },

  totalPositions: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total number of unique participants'
  },
  totalPredictors: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total number of unique predictors'
  },
  totalShares: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total shares issued across all options'
  },

  publicTotalVolume: {
    type: Number,
    default: 0,
    description: 'Public total volume (visible only after resolution)'
  },

  winningOptionIndex: {
    type: Number,
    default: null,
    description: 'Index of winning option after resolution'
  },
  resolvedBy: {
    type: String,
    default: null,
    description: 'Wallet address of resolver'
  },
  resolutionSource: {
    type: String,
    default: null,
    description: 'Source used for prediction resolution'
  },

  mustShowLive: {
    type: Boolean,
    default: false
  },
  liveStartTime: {
    type: Date,
    default: null
  },
  liveEndTime: {
    type: Date,
    default: null
  },

  useFHEVM: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether this prediction uses FHEVM encryption'
  },
  encryptionMetadata: {
    aclAddress: {
      type: String,
      default: '0x2Fb4341027eb1d2aD8B5D9708187df8633cAFA92',
      description: 'FHEVM ACL contract address'
    },
    kmsAddress: {
      type: String,
      default: '0x596E6682c72946AF006B27C131793F2B62527A4B',
      description: 'FHEVM KMS contract address'
    },
    chainId: {
      type: Number,
      default: 8009,
      description: 'Zama devnet chain ID'
    },
    encryptionVersion: {
      type: String,
      default: '0.5.0',
      description: 'FHEVM encryption version'
    }
  },

  lastSyncBlock: {
    type: Number,
    default: 0,
    description: 'Last block number where this prediction was synced from contract'
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed', 'stale'],
    default: 'pending',
    description: 'Current sync status with contract'
  },
  contractStateHash: {
    type: String,
    default: null,
    description: 'Hash of contract state for validation'
  },
  lastSyncAt: {
    type: Date,
    default: Date.now,
    description: 'Last time this prediction was synced from contract'
  },

  contractTxHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'],
  },

  resolveTxHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'],
  },

  createdByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },

  resolvedByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  slug: {
    type: String,
    trim: true,
    lowercase: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'predictions'
});

// Optimized indexes for FHEVM hybrid architecture
predictionHybridSchema.index({ contractId: 1 }, { unique: true });
predictionHybridSchema.index({ topicId: 1, isActive: 1 });
predictionHybridSchema.index({ endTime: 1, isActive: 1 });
predictionHybridSchema.index({ isResolved: 1, useFHEVM: 1 });
predictionHybridSchema.index({ useFHEVM: 1, isActive: 1 });
predictionHybridSchema.index({ createdBy: 1 });
predictionHybridSchema.index({ syncStatus: 1, lastSyncAt: 1 });
predictionHybridSchema.index({ totalParticipants: -1 });
predictionHybridSchema.index({ createdAt: -1 });
predictionHybridSchema.index({ 'encryptionMetadata.chainId': 1 });

// Grouping indexes for nested predictions
predictionHybridSchema.index({ 'predictionGroup.groupId': 1, 'predictionGroup.groupOrder': 1 });
predictionHybridSchema.index({ 'predictionGroup.groupType': 1, isActive: 1 });
predictionHybridSchema.index({ 'predictionGroup.isGroupHeader': 1 });

// Virtual for topic
predictionHybridSchema.virtual('topic', {
  ref: 'Topic',
  localField: 'topicId',
  foreignField: 'topicId',
  justOne: true,
});

// Virtual fields
predictionHybridSchema.virtual('isEnded').get(function() {
  return new Date() > this.endTime;
});

predictionHybridSchema.virtual('timeRemaining').get(function() {
  return Math.max(0, this.endTime - Date.now());
});

// Methods
predictionHybridSchema.methods.updateFromContract = function(contractData) {
  this.isActive = contractData.isActive;
  this.isResolved = contractData.isResolved;
  this.totalParticipants = contractData.totalParticipants;
  this.syncStatus = 'synced';
  this.lastSyncAt = new Date();
  return this.save();
};

module.exports = mongoose.model('PredictionHybrid', predictionHybridSchema);