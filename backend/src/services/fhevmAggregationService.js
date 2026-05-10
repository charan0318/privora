const { ethers } = require('ethers');
const Prediction = require('../models/Prediction');
const Position = require('../models/Position');

/**
 * FHEVM Aggregation Service
 * Handles encrypted amount aggregation and privacy-preserving analytics
 */
class FHEVMAggregationService {
  constructor() {
    this.provider = null;
    this.predictionMarketContract = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔢 Initializing FHEVM Aggregation Service...');

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

      // Initialize contract
      const PredictionMarketArtifact = require('../abi/PredictionMarket.json');
      this.predictionMarketContract = new ethers.Contract(
        process.env.PREDICTION_MARKET_ADDRESS,
        PredictionMarketArtifact.abi,
        this.provider
      );

      this.isInitialized = true;
      console.log('✅ FHEVM Aggregation Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM Aggregation Service:', error);
      throw error;
    }
  }

  /**
   * Get aggregated prediction data with privacy preservation
   */
  async getAggregatedPredictionData(contractPredictionId, userAddress = null) {
    try {
      console.log(`📊 Getting aggregated data for prediction ${contractPredictionId}...`);

      const prediction = await Prediction.findOne({ contractId: contractPredictionId });
      if (!prediction) {
        throw new Error(`Prediction ${contractPredictionId} not found`);
      }

      // Get basic public data
      const aggregatedData = {
        predictionId: contractPredictionId,
        title: prediction.title,
        description: prediction.description,
        endTime: prediction.endTime,
        isActive: prediction.isActive,
        isResolved: prediction.isResolved,

        // Public statistics
        totalParticipants: prediction.totalParticipants,
        totalPositions: prediction.totalPositions,
        totalShares: prediction.totalShares,

        // Option data
        options: [],

        // Privacy flags
        usesEncryption: prediction.useFHEVM
      };

      // Process each option
      for (let i = 0; i < prediction.options.length; i++) {
        const option = prediction.options[i];

        const optionData = {
          index: i,
          title: option.title,
          description: option.description,
          currentPrice: option.currentPrice,
          isWinner: option.isWinner,
          publicTotalShares: option.publicTotalShares
        };

        // Add encrypted data if prediction is resolved or user has access
        if (prediction.isResolved || this.canUserViewEncryptedData(userAddress, prediction)) {
          // For resolved predictions, we can show aggregated totals
          if (prediction.isResolved) {
            optionData.totalAmount = await this.getDecryptedOptionTotal(contractPredictionId, i);
            optionData.showEncryptedData = false;
          } else {
            // User has special access but prediction not resolved
            optionData.showEncryptedData = true;
            optionData.encryptedTotalAmount = option.encryptedTotalAmount;
          }
        } else {
          // Hide encrypted data
          optionData.showEncryptedData = false;
          optionData.totalAmount = 'Private';
        }

        aggregatedData.options.push(optionData);
      }

      // Calculate market dynamics for resolved predictions
      if (prediction.isResolved) {
        aggregatedData.publicTotalVolume = prediction.publicTotalVolume;
        aggregatedData.marketDynamics = await this.calculateMarketDynamics(contractPredictionId);
      } else {
        aggregatedData.publicTotalVolume = 'Private';
        aggregatedData.marketDynamics = null;
      }

      return aggregatedData;

    } catch (error) {
      console.error(`❌ Error getting aggregated prediction data for ${contractPredictionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate market dynamics (only for resolved predictions)
   */
  async calculateMarketDynamics(contractPredictionId) {
    try {
      const positions = await Position.find({
        contractPredictionId,
        isResolved: true,
        amount: { $ne: null } // Only positions with decrypted amounts
      });

      if (positions.length === 0) {
        return null;
      }

      // Group by option
      const optionData = {};
      let totalVolume = 0;

      positions.forEach(position => {
        if (!optionData[position.optionIndex]) {
          optionData[position.optionIndex] = {
            totalAmount: 0,
            totalShares: 0,
            participantCount: 0,
            participants: new Set()
          };
        }

        optionData[position.optionIndex].totalAmount += position.amount;
        optionData[position.optionIndex].totalShares += position.shares || 0;
        optionData[position.optionIndex].participants.add(position.userAddress);
        totalVolume += position.amount;
      });

      // Calculate final metrics
      const dynamics = {
        totalVolume,
        optionBreakdown: []
      };

      Object.keys(optionData).forEach(optionIndex => {
        const data = optionData[optionIndex];
        dynamics.optionBreakdown.push({
          optionIndex: Number(optionIndex),
          totalAmount: data.totalAmount,
          totalShares: data.totalShares,
          participantCount: data.participants.size,
          volumePercentage: totalVolume > 0 ? (data.totalAmount / totalVolume) * 100 : 0,
          averagePositionSize: data.participants.size > 0 ? data.totalAmount / data.participants.size : 0
        });
      });

      return dynamics;

    } catch (error) {
      console.error(`❌ Error calculating market dynamics:`, error);
      return null;
    }
  }

  /**
   * Get user's portfolio aggregation with privacy
   */
  async getUserPortfolioAggregation(userAddress) {
    try {
      console.log(`👤 Getting portfolio aggregation for ${userAddress}...`);

      const positions = await Position.find({
        userAddress: userAddress.toLowerCase()
      }).populate('predictionId', 'title endTime isResolved useFHEVM');

      const portfolio = {
        totalPositions: positions.length,
        activePositions: 0,
        resolvedPositions: 0,
        wonPositions: 0,
        totalPotentialPayout: 0,
        totalInvested: 0,
        totalRealized: 0,
        positions: []
      };

      for (const position of positions) {
        const positionData = {
          predictionId: position.contractPredictionId,
          predictionTitle: position.predictionId?.title || 'Unknown Prediction',
          optionIndex: position.optionIndex,
          entryPrice: position.entryPrice,
          status: position.status,
          isResolved: position.isResolved,
          isWinner: position.isWinner,
          claimed: position.claimed,
          placePositionTxHash: position.placePositionTxHash
        };

        // Add financial data based on encryption and resolution status
        if (position.isEncrypted) {
          if (position.isResolved && position.amount !== null) {
            // Prediction is resolved, show decrypted amounts
            positionData.amount = position.amount;
            positionData.shares = position.shares;
            positionData.payout = position.payout || 0;
            positionData.profitLoss = position.isWinner ? (position.payout - position.amount) : -position.amount;

            portfolio.totalInvested += position.amount;
            if (position.claimed && position.payout) {
              portfolio.totalRealized += position.payout;
            }
          } else {
            // Prediction not resolved or amounts not decrypted
            positionData.amount = 'Private';
            positionData.shares = 'Private';
            positionData.payout = 'Private';
            positionData.profitLoss = 'Private';
          }
        } else {
          // Non-encrypted prediction (if any)
          positionData.amount = position.amount;
          positionData.shares = position.shares;
          positionData.payout = position.payout || 0;
          positionData.profitLoss = position.isWinner ? (position.payout - position.amount) : -position.amount;

          portfolio.totalInvested += position.amount || 0;
          if (position.claimed && position.payout) {
            portfolio.totalRealized += position.payout;
          }
        }

        // Update counters
        if (position.isResolved) {
          portfolio.resolvedPositions++;
          if (position.isWinner) {
            portfolio.wonPositions++;
          }
        } else {
          portfolio.activePositions++;
        }

        portfolio.positions.push(positionData);
      }

      // Calculate additional metrics
      portfolio.winRate = portfolio.resolvedPositions > 0 ?
        (portfolio.wonPositions / portfolio.resolvedPositions) * 100 : 0;

      portfolio.roi = portfolio.totalInvested > 0 ?
        ((portfolio.totalRealized - portfolio.totalInvested) / portfolio.totalInvested) * 100 : 0;

      return portfolio;

    } catch (error) {
      console.error(`❌ Error getting user portfolio aggregation:`, error);
      throw error;
    }
  }

  /**
   * Get platform-wide aggregated statistics
   */
  async getPlatformAggregatedStatistics() {
    try {
      console.log('🌐 Getting platform aggregated statistics...');

      const [
        totalPredictions,
        activePredictions,
        resolvedPredictions,
        totalUsers,
        recentActivity
      ] = await Promise.all([
        Prediction.countDocuments(),
        Prediction.countDocuments({ isActive: true, isResolved: false }),
        Prediction.countDocuments({ isResolved: true }),
        Position.distinct('userAddress').then(addresses => addresses.length),
        this.getRecentActivitySummary()
      ]);

      // For privacy, we don't aggregate total volumes across all predictions
      // Only resolved predictions can show their volumes
      const resolvedPredictionsWithVolume = await Prediction.find({
        isResolved: true,
        publicTotalVolume: { $gt: 0 }
      }).select('publicTotalVolume');

      const totalResolvedVolume = resolvedPredictionsWithVolume.reduce(
        (sum, prediction) => sum + prediction.publicTotalVolume, 0
      );

      return {
        totalPredictions,
        activePredictions,
        resolvedPredictions,
        totalUsers,
        totalResolvedVolume, // Only from resolved predictions
        averageResolvedPredictionVolume: resolvedPredictionsWithVolume.length > 0 ?
          totalResolvedVolume / resolvedPredictionsWithVolume.length : 0,
        recentActivity,
        privacyNote: 'Active prediction volumes are encrypted and not included in totals'
      };

    } catch (error) {
      console.error('❌ Error getting platform aggregated statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent activity summary (privacy-preserving)
   */
  async getRecentActivitySummary(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [recentPositions, recentPredictions] = await Promise.all([
        Position.countDocuments({ createdAt: { $gte: since } }),
        Prediction.countDocuments({ createdAt: { $gte: since } })
      ]);

      return {
        recentPredictions,
        recentPositions,
        timeframe: `${hours} hours`
      };

    } catch (error) {
      console.error('❌ Error getting recent activity summary:', error);
      return { recentPredictions: 0, recentPositions: 0 };
    }
  }

  /**
   * Decrypt option total (only possible for resolved predictions)
   */
  async getDecryptedOptionTotal(contractPredictionId, optionIndex) {
    try {
      // In a real implementation, this would use FHEVM decryption
      // For now, we'll sum up the decrypted amounts from user positions
      const positions = await Position.find({
        contractPredictionId,
        optionIndex,
        isResolved: true,
        amount: { $ne: null }
      });

      return positions.reduce((sum, position) => sum + (position.amount || 0), 0);

    } catch (error) {
      console.error(`❌ Error getting decrypted option total:`, error);
      return 0;
    }
  }

  /**
   * Check if user can view encrypted data
   */
  canUserViewEncryptedData(userAddress, prediction) {
    if (!userAddress) return false;

    // Prediction creator can view
    if (prediction.createdBy.toLowerCase() === userAddress.toLowerCase()) {
      return true;
    }

    // Add other access control logic here (admin, etc.)
    return false;
  }

  /**
   * Update aggregated data for a prediction (called after new positions)
   */
  async updatePredictionAggregatedData(contractPredictionId) {
    try {
      console.log(`🔄 Updating aggregated data for prediction ${contractPredictionId}...`);

      const prediction = await Prediction.findOne({ contractId: contractPredictionId });
      if (!prediction) return;

      const positions = await Position.find({ contractPredictionId });

      // Update public statistics
      prediction.totalPositions = positions.length;
      prediction.totalParticipants = new Set(positions.map(p => p.userAddress)).size;

      // If prediction is resolved, update public volume
      if (prediction.isResolved) {
        const totalVolume = positions
          .filter(p => p.amount !== null)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        prediction.publicTotalVolume = totalVolume;
      }

      // Update per-option aggregated data
      for (let i = 0; i < prediction.options.length; i++) {
        const optionPositions = positions.filter(p => p.optionIndex === i);

        // Update public shares count
        prediction.options[i].publicTotalShares = optionPositions.length;

        // For resolved predictions, update total amounts
        if (prediction.isResolved) {
          const optionTotal = optionPositions
            .filter(p => p.amount !== null)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          // Store as string to maintain consistency with encrypted format
          prediction.options[i].encryptedTotalAmount = optionTotal.toString();
        }
      }

      await prediction.save();
      console.log(`✅ Updated aggregated data for prediction ${contractPredictionId}`);

    } catch (error) {
      console.error(`❌ Error updating aggregated data for prediction ${contractPredictionId}:`, error);
    }
  }

  /**
   * Aggregate encrypted amounts for analytics (privacy-preserving)
   */
  async getPrivacyPreservingAnalytics(contractPredictionId) {
    try {
      const positions = await Position.find({ contractPredictionId });

      // We can provide analytics that don't reveal individual amounts
      return {
        participantCount: new Set(positions.map(p => p.userAddress)).size,
        positionCount: positions.length,
        optionDistribution: this.calculateOptionDistribution(positions),
        timeDistribution: this.calculateTimeDistribution(positions),
        // No amount-based analytics for active encrypted predictions
        privacyNote: 'Amount-based analytics available only after prediction resolution'
      };

    } catch (error) {
      console.error('❌ Error getting privacy-preserving analytics:', error);
      return null;
    }
  }

  /**
   * Calculate option distribution (count-based, not amount-based)
   */
  calculateOptionDistribution(positions) {
    const distribution = {};
    positions.forEach(position => {
      distribution[position.optionIndex] = (distribution[position.optionIndex] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate time distribution of positions
   */
  calculateTimeDistribution(positions) {
    const hourlyDistribution = {};
    positions.forEach(position => {
      const hour = new Date(position.createdAt).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    return hourlyDistribution;
  }
}

module.exports = new FHEVMAggregationService();