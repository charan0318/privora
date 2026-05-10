const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Prediction = require('../models/Prediction');
const Position = require('../models/Position');
const PredictionEvent = require('../models/PredictionEvent');
const fhevmAggregationService = require('./fhevmAggregationService');

/**
 * FHEVM-aware synchronization service
 * Syncs contract state with database while preserving FHEVM encryption
 */
class FHEVMSyncService {
  constructor() {
    this.provider = null;
    this.predictionMarketContract = null;
    this.isInitialized = false;
    this.syncingPredictions = new Set();
  }

  async initialize() {
    try {
      console.log('🔐 Initializing FHEVM Sync Service...');

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

      // Initialize contract
      const PredictionMarketArtifact = require('../abi/PredictionMarket.json');
      this.predictionMarketContract = new ethers.Contract(
        process.env.PREDICTION_MARKET_ADDRESS,
        PredictionMarketArtifact.abi,
        this.provider
      );

      // Initialize aggregation service
      await fhevmAggregationService.initialize();

      this.isInitialized = true;
      console.log('✅ FHEVM Sync Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM Sync Service:', error);
      throw error;
    }
  }

  /**
   * Sync a specific prediction from contract to database
   */
  async syncPredictionFromContract(contractPredictionId) {
    if (this.syncingPredictions.has(contractPredictionId)) {
      console.log(`⏳ Prediction ${contractPredictionId} already syncing, skipping...`);
      return;
    }

    this.syncingPredictions.add(contractPredictionId);

    try {
      console.log(`🔄 Syncing prediction ${contractPredictionId} from contract...`);

      // Get prediction data from contract
      const contractPrediction = await this.predictionMarketContract.getPrediction(contractPredictionId);

      // Find or create prediction in database
      let dbPrediction = await Prediction.findOne({ contractId: contractPredictionId });

      if (!dbPrediction) {
        // Create new prediction
        dbPrediction = await this.createPredictionFromContract(contractPredictionId, contractPrediction);
      } else {
        // Update existing prediction
        await this.updatePredictionFromContract(dbPrediction, contractPrediction);
      }

      // Sync user positions for this prediction
      await this.syncUserPositionsForPrediction(contractPredictionId);

      console.log(`✅ Prediction ${contractPredictionId} synced successfully`);

    } catch (error) {
      console.error(`❌ Error syncing prediction ${contractPredictionId}:`, error);
      throw error;
    } finally {
      this.syncingPredictions.delete(contractPredictionId);
    }
  }

  /**
   * Create new prediction from contract data
   */
  async createPredictionFromContract(contractPredictionId, contractPrediction) {
    console.log(`🆕 Creating new prediction ${contractPredictionId} from contract...`);

    // Prepare options array
    const options = [];
    for (let i = 0; i < Number(contractPrediction.optionCount); i++) {
      const optionData = await this.predictionMarketContract.getPredictionOption(contractPredictionId, i);

      options.push({
        title: `Option ${i + 1}`, // Default title - admin can edit
        description: '',
        currentPrice: 50, // Default price
        isWinner: optionData.isWinner,
        encryptedTotalAmount: optionData.totalAmount.toString(),
        publicTotalShares: Number(optionData.totalShares)
      });
    }

    const newPrediction = new Prediction({
      contractId: contractPredictionId,
      contractAddress: process.env.PREDICTION_MARKET_ADDRESS.toLowerCase(),

      // Presentation data (admin can edit these)
      title: `Prediction #${contractPredictionId}`, // Default title
      description: 'No description provided', // Default description
      topicId: 'general', // Default topic
      imageUrl: '',
      featured: false,
      priority: 0,
      visibility: 'public',

      // Contract state (immutable)
      endTime: new Date(Number(contractPrediction.endTime) * 1000),
      isActive: contractPrediction.isActive,
      isResolved: contractPrediction.isResolved,
      predictionType: Number(contractPrediction.predictionType),
      createdBy: contractPrediction.createdBy.toLowerCase(),
      totalParticipants: Number(contractPrediction.totalParticipants),
      minPositionAmount: Number(contractPrediction.minPositionAmount),
      maxPositionAmount: Number(contractPrediction.maxPositionAmount),

      // Options
      options,

      // FHEVM configuration
      useFHEVM: true,
      encryptionMetadata: {
        aclAddress: '0x2Fb4341027eb1d2aD8B5D9708187df8633cAFA92',
        kmsAddress: '0x596E6682c72946AF006B27C131793F2B62527A4B',
        chainId: 8009,
        encryptionVersion: '0.5.0'
      },

      // Sync metadata
      lastSyncBlock: await this.provider.getBlockNumber(),
      syncStatus: 'synced',
      lastSyncAt: new Date()
    });

    await newPrediction.save();
    console.log(`✅ Created prediction ${contractPredictionId} in database`);

    return newPrediction;
  }

  /**
   * Update existing prediction from contract data
   */
  async updatePredictionFromContract(dbPrediction, contractPrediction) {
    console.log(`🔄 Updating prediction ${dbPrediction.contractId} from contract...`);

    // Update contract state (preserve presentation data)
    dbPrediction.endTime = new Date(Number(contractPrediction.endTime) * 1000);
    dbPrediction.isActive = contractPrediction.isActive;
    dbPrediction.isResolved = contractPrediction.isResolved;
    dbPrediction.totalParticipants = Number(contractPrediction.totalParticipants);

    // Update options with contract data
    for (let i = 0; i < Number(contractPrediction.optionCount); i++) {
      const optionData = await this.predictionMarketContract.getPredictionOption(dbPrediction.contractId, i);

      if (dbPrediction.options[i]) {
        // Update existing option
        dbPrediction.options[i].isWinner = optionData.isWinner;
        dbPrediction.options[i].encryptedTotalAmount = optionData.totalAmount.toString();
        dbPrediction.options[i].publicTotalShares = Number(optionData.totalShares);
      } else {
        // Add new option
        dbPrediction.options.push({
          title: `Option ${i + 1}`,
          description: '',
          currentPrice: 50,
          isWinner: optionData.isWinner,
          encryptedTotalAmount: optionData.totalAmount.toString(),
          publicTotalShares: Number(optionData.totalShares)
        });
      }
    }

    // Update sync metadata
    dbPrediction.lastSyncBlock = await this.provider.getBlockNumber();
    dbPrediction.syncStatus = 'synced';
    dbPrediction.lastSyncAt = new Date();

    await dbPrediction.save();
    console.log(`✅ Updated prediction ${dbPrediction.contractId} in database`);
  }

  /**
   * Sync user positions for a specific prediction
   */
  async syncUserPositionsForPrediction(contractPredictionId) {
    try {
      console.log(`👥 Syncing user positions for prediction ${contractPredictionId}...`);

      // Get all PositionPlaced events for this prediction
      const positionPlacedEvents = await PredictionEvent.find({
        eventType: 'PositionPlaced',
        predictionId: contractPredictionId.toString(),
        processed: true
      }).sort({ blockNumber: 1 });

      console.log(`📊 Found ${positionPlacedEvents.length} PositionPlaced events for prediction ${contractPredictionId}`);

      for (const event of positionPlacedEvents) {
        await this.syncUserPosition(event);
      }

      console.log(`✅ Synced user positions for prediction ${contractPredictionId}`);

    } catch (error) {
      console.error(`❌ Error syncing user positions for prediction ${contractPredictionId}:`, error);
    }
  }

  /**
   * Sync individual user position from event
   */
  async syncUserPosition(positionEvent) {
    try {
      // Check if position already exists
      const existingPosition = await Position.findOne({
        contractPredictionId: Number(positionEvent.predictionId),
        userAddress: positionEvent.user.toLowerCase(),
        placePositionTxHash: positionEvent.txHash
      });

      if (existingPosition) {
        console.log(`⏭️ Position already exists for user ${positionEvent.user} in prediction ${positionEvent.predictionId}`);
        return;
      }

      // Find the database prediction
      const dbPrediction = await Prediction.findOne({ contractId: Number(positionEvent.predictionId) });
      if (!dbPrediction) {
        console.error(`❌ Database prediction not found for contract prediction ${positionEvent.predictionId}`);
        return;
      }

      // Get user position details from contract
      const userPositions = await this.predictionMarketContract.getUserPositions(positionEvent.user);
      const relevantPosition = userPositions.find(position =>
        position.predictionId.toString() === positionEvent.predictionId.toString()
      );

      if (!relevantPosition) {
        console.error(`❌ User position not found in contract for ${positionEvent.user} in prediction ${positionEvent.predictionId}`);
        return;
      }

      // Create new user position
      const userPosition = new Position({
        predictionId: dbPrediction._id,
        contractPredictionId: Number(positionEvent.predictionId),
        userId: null, // Will be set when user registers
        userAddress: positionEvent.user.toLowerCase(),
        optionIndex: Number(positionEvent.optionIndex),

        // FHEVM encrypted data
        isEncrypted: true,
        encryptedAmount: relevantPosition.amount.toString(),
        encryptedShares: positionEvent.shares.toString(),

        // Public metadata
        entryPrice: this.calculateEntryPrice(positionEvent.shares, positionEvent.actualAmount || 0),

        // Transaction data
        placePositionTxHash: positionEvent.txHash,
        blockNumber: positionEvent.blockNumber,

        // Status
        status: 'active',
        isResolved: dbPrediction.isResolved,

        // Sync data
        lastSyncBlock: positionEvent.blockNumber,
        syncStatus: 'synced'
      });

      await userPosition.save();
      console.log(`✅ Created user position for ${positionEvent.user} in prediction ${positionEvent.predictionId}`);

      // Update aggregated data for the prediction
      await fhevmAggregationService.updatePredictionAggregatedData(Number(positionEvent.predictionId));

    } catch (error) {
      console.error(`❌ Error syncing user position:`, error);
    }
  }

  /**
   * Calculate entry price based on shares and amount
   */
  calculateEntryPrice(shares, amount) {
    if (!shares || !amount || amount === 0) return 50; // Default price

    // Simple calculation - in production this would be more sophisticated
    const price = (amount / shares) * 100;
    return Math.max(1, Math.min(99, price)); // Clamp between 1-99
  }

  /**
   * Process PositionPlaced event and update database
   */
  async processPositionPlacedEvent(eventData) {
    try {
      console.log('🎯 Processing FHEVM PositionPlaced event:', eventData);

      // Ensure prediction exists in database
      await this.syncPredictionFromContract(Number(eventData.predictionId));

      // Create or update user position
      await this.syncUserPosition(eventData);

      console.log('✅ FHEVM PositionPlaced event processed successfully');

    } catch (error) {
      console.error('❌ Error processing FHEVM PositionPlaced event:', error);
      throw error;
    }
  }

  /**
   * Process PredictionResolved event and update database
   */
  async processPredictionResolvedEvent(eventData) {
    try {
      console.log('🏆 Processing FHEVM PredictionResolved event:', eventData);

      // Sync prediction resolution
      await this.syncPredictionFromContract(Number(eventData.predictionId));

      // Update all user positions for this prediction
      await this.updateUserPositionsOnResolution(Number(eventData.predictionId), Number(eventData.winnerIndex));

      // Update aggregated data after resolution
      await fhevmAggregationService.updatePredictionAggregatedData(Number(eventData.predictionId));

      console.log('✅ FHEVM PredictionResolved event processed successfully');

    } catch (error) {
      console.error('❌ Error processing FHEVM PredictionResolved event:', error);
      throw error;
    }
  }

  /**
   * Update user positions when prediction is resolved
   */
  async updateUserPositionsOnResolution(contractPredictionId, winnerIndex) {
    try {
      const positions = await Position.find({ contractPredictionId });

      for (const position of positions) {
        position.isResolved = true;
        position.isWinner = position.optionIndex === winnerIndex;
        position.status = position.isWinner ? 'resolved' : 'resolved';

        await position.save();
      }

      console.log(`✅ Updated ${positions.length} positions for resolved prediction ${contractPredictionId}`);

    } catch (error) {
      console.error(`❌ Error updating positions for resolved prediction ${contractPredictionId}:`, error);
    }
  }

  // Removed updatePredictionStatistics - now handled by fhevmAggregationService

  /**
   * Sync all predictions that need synchronization
   */
  async syncPendingPredictions() {
    try {
      const pendingPredictions = await Prediction.getPredictionsRequiringSync();

      console.log(`🔄 Found ${pendingPredictions.length} predictions requiring sync`);

      for (const prediction of pendingPredictions) {
        await this.syncPredictionFromContract(prediction.contractId);

        // Add delay to prevent overwhelming the RPC
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('✅ Completed syncing pending predictions');

    } catch (error) {
      console.error('❌ Error syncing pending predictions:', error);
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(intervalMs = 60000) { // Default: 1 minute
    console.log(`⏰ Starting periodic sync every ${intervalMs}ms`);

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncPendingPredictions();
      } catch (error) {
        console.error('❌ Error in periodic sync:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Stopped periodic sync');
    }
  }
}

module.exports = new FHEVMSyncService();