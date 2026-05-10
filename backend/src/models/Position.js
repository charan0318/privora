const mongoose = require('mongoose');

// Professional Position model - separated from Prediction for better performance
const positionSchema = new mongoose.Schema({
  // References
  predictionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prediction',
    required: true,
    index: true
  },
  contractPredictionId: {
    type: Number,
    required: true,
    index: true,
    description: 'Contract prediction ID for validation'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional - we use userAddress for wallet-based authentication
    index: true
  },
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-f0-9]{40}$/i, 'Invalid Ethereum address'],
    index: true
  },

  // Position details
  optionIndex: {
    type: Number,
    required: true,
    min: 0,
    description: 'Index of the option user positioned on'
  },
  outcome: {
    type: Number,
    default: null,
    enum: [0, 1, null],
    description: 'For nested predictions: 0=Yes, 1=No. For binary/multiple: null'
  },

  // ===== FHEVM ENCRYPTED FINANCIAL DATA =====
  // Public metadata (always visible)
  entryPrice: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    description: 'Price when position was opened'
  },

  // FHEVM encrypted private data
  isEncrypted: {
    type: Boolean,
    default: true,
    description: 'Whether this position uses FHEVM encryption'
  },
  encryptedAmount: {
    type: String,
    required: true,
    description: 'FHEVM encrypted position amount (euint64)'
  },
  encryptedShares: {
    type: String,
    default: null,
    description: 'FHEVM encrypted shares purchased'
  },

  // Public data (only visible after resolution or to position owner)
  amount: {
    type: Number,
    default: null,
    min: 0,
    description: 'Decrypted amount (visible only after resolution or to owner)'
  },
  shares: {
    type: Number,
    default: null,
    min: 0,
    description: 'Decrypted shares (visible only after resolution or to owner)'
  },

  // Transaction tracking
  placePositionTxHash: {
    type: String,
    required: true,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'],
    unique: true,
    description: 'Transaction hash where position was opened'
  },
  blockNumber: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    description: 'Block number where position was placed'
  },

  // ===== RESOLUTION & PAYOUT (FHEVM AWARE) =====
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  },
  isWinner: {
    type: Boolean,
    default: false,
    description: 'Whether this position won'
  },

  // Encrypted payout (FHEVM)
  encryptedPayout: {
    type: String,
    default: null,
    description: 'FHEVM encrypted payout amount'
  },

  // Public payout (only after claim)
  payout: {
    type: Number,
    default: null,
    min: 0,
    description: 'Decrypted payout amount (visible only after claim)'
  },

  claimed: {
    type: Boolean,
    default: false,
    index: true
  },
  claimTxHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'],
    description: 'Transaction hash where payout was claimed'
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'resolved', 'claimed', 'expired'],
    default: 'active',
    index: true
  },

  // Sync tracking
  lastSyncBlock: {
    type: Number,
    default: 0
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true,
  collection: 'positions'
});

// Compound indexes for performance
positionSchema.index({ predictionId: 1, userAddress: 1 });
positionSchema.index({ userAddress: 1, status: 1 });
positionSchema.index({ contractPredictionId: 1, optionIndex: 1 });
positionSchema.index({ isResolved: 1, claimed: 1 });

// Virtual for profit/loss calculation
positionSchema.virtual('profitLoss').get(function() {
  if (!this.isResolved) return 0;
  return this.isWinner ? (this.payout - this.amount) : -this.amount;
});

// Static methods
positionSchema.statics.getUserPositions = function(userAddress, status = null, includeEncrypted = false) {
  const query = { userAddress: userAddress.toLowerCase() };
  if (status) query.status = status;

  let queryBuilder = this.find(query)
    .populate('predictionId', 'title endTime isResolved useFHEVM')
    .sort({ createdAt: -1 });

  // If not including encrypted data, exclude encrypted fields
  if (!includeEncrypted) {
    queryBuilder = queryBuilder.select('-encryptedAmount -encryptedShares -encryptedPayout');
  }

  return queryBuilder;
};

// Get positions for FHEVM sync
positionSchema.statics.getPositionsForSync = function(predictionId) {
  return this.find({
    contractPredictionId: predictionId,
    syncStatus: { $in: ['pending', 'failed'] }
  });
};

positionSchema.statics.getPredictionPositions = function(predictionId, requestingUserAddress = null) {
  const query = this.find({ predictionId })
    .populate('userId', 'username')
    .sort({ createdAt: -1 });

  // For privacy, only show encrypted data to position owners
  if (!requestingUserAddress) {
    return query.select('-encryptedAmount -encryptedShares -encryptedPayout');
  }

  return query;
};

// FHEVM-aware instance methods
positionSchema.methods.calculatePayout = function(totalPool, winningPool) {
  if (!this.isWinner || winningPool === 0) return 0;

  // For encrypted positions, calculation happens on-chain
  if (this.isEncrypted && !this.shares) {
    throw new Error('Cannot calculate payout for encrypted position without decrypted shares');
  }

  return (this.shares / winningPool) * totalPool;
};

// Check if user can view encrypted data
positionSchema.methods.canUserViewEncrypted = function(requestingUserAddress) {
  return this.userAddress.toLowerCase() === requestingUserAddress.toLowerCase();
};

// Get display-safe version for API responses
positionSchema.methods.toPublicJSON = function(requestingUserAddress = null) {
  const position = this.toObject();

  // If not the position owner and position is encrypted, hide sensitive data
  if (this.isEncrypted && !this.canUserViewEncrypted(requestingUserAddress)) {
    delete position.encryptedAmount;
    delete position.encryptedShares;
    delete position.encryptedPayout;
    delete position.amount;
    delete position.shares;
    delete position.payout;

    // Mark as private
    position._isPrivate = true;
  }

  return position;
};

module.exports = mongoose.model('Position', positionSchema);