const Prediction = require('../models/Prediction');
const Position = require('../models/Position');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Prediction Pool Service
 * Handles prediction pool mechanics, reward distribution, and market dynamics
 */
class PredictionPoolService {

  /**
   * Calculate current prices for all options in a prediction
   * Uses Automated Market Maker (AMM) formula for dynamic pricing
   */
  static calculateOptionPrices(prediction) {
    const totalVolume = prediction.totalVolume || 0;
    console.log(`📊 calculateOptionPrices - totalVolume: ${totalVolume}, prediction: ${prediction.title}`);

    if (totalVolume === 0) {
      // Use stored currentPrice from database (from seed data or admin panel)
      const prices = prediction.options.map(option => {
        const price = Math.round(option.currentPrice || 50);
        console.log(`💰 Using stored currentPrice: ${option.currentPrice} → ${price}`);
        return price;
      });
      console.log(`✅ Returning stored prices: ${prices.join(', ')}`);
      return prices;
    }

    // Calculate shares for each option
    const optionVolumes = prediction.options.map(option => option.totalAmount || 0);

    // Use constant product formula for price calculation
    const prices = optionVolumes.map(volume => {
      if (totalVolume === 0) return 50; // Default price

      // Price = (volume / total) * 100 with some smoothing
      let price = (volume / totalVolume) * 100;

      // Add liquidity adjustment to prevent extreme prices
      const liquidityAdjustment = Math.min(5, totalVolume * 0.01);
      price = Math.max(5 + liquidityAdjustment, Math.min(95 - liquidityAdjustment, price));

      return Math.round(price);
    });

    return prices;
  }

  /**
   * Calculate shares a user will receive for a given position amount
   */
  static calculateShares(positionAmount, optionPrice, totalPool = 0) {
    // Base shares calculation
    let shares = positionAmount / (optionPrice / 100);

    // Apply bonuses for early positioning or large pools
    if (totalPool > 0) {
      // Early bird bonus (decreases as pool grows)
      const earlyBirdMultiplier = Math.max(1, 1.1 - (totalPool / 10000));
      shares *= earlyBirdMultiplier;
    }

    return parseFloat(shares.toFixed(8));
  }

  /**
   * Calculate potential winnings for a position
   */
  static calculatePotentialWinnings(shares, optionTotalShares, totalPoolValue) {
    if (!shares || !totalPoolValue || optionTotalShares === 0) return 0;

    // Winner takes all model with platform fee
    const platformFeeRate = 0.02; // 2% platform fee
    const netPoolValue = totalPoolValue * (1 - platformFeeRate);

    // Proportional share of the winning pool
    const shareRatio = shares / optionTotalShares;
    const potentialWinnings = shareRatio * netPoolValue;

    return parseFloat(potentialWinnings.toFixed(8));
  }

  /**
   * Update prediction prices after a new position is placed
   */
  static async updatePredictionPrices(predictionId, placedOptionIndex, amount) {
    try {
      const prediction = await Prediction.findById(predictionId);
      if (!prediction) throw new AppError('Prediction not found', 404);

      // Recalculate all option prices
      const newPrices = this.calculateOptionPrices(prediction);

      // Update the prediction options with new prices
      prediction.options.forEach((option, index) => {
        option.yesPrice = newPrices[index];
        option.noPrice = 100 - newPrices[index];
      });

      await prediction.save();

      logger.info(`Prices updated for prediction ${predictionId} after ${amount} position on option ${placedOptionIndex}`);

      return newPrices;
    } catch (error) {
      logger.error('Error updating prediction prices:', error);
      throw error;
    }
  }

  /**
   * Calculate and distribute winnings when a prediction is resolved
   */
  static async distributeWinnings(predictionId, winningOptionIndex) {
    try {
      const prediction = await Prediction.findById(predictionId);
      if (!prediction) throw new AppError('Prediction not found', 404);

      if (!prediction.isResolved) throw new AppError('Prediction is not resolved', 400);

      const winningOption = prediction.options[winningOptionIndex];
      const totalPool = prediction.totalVolume;
      const platformFeeRate = 0.02; // 2% platform fee
      const netPool = totalPool * (1 - platformFeeRate);

      // Calculate winnings for each winning position using Position model
      const winningPositions = await Position.find({
        predictionId: prediction._id,
        optionIndex: winningOptionIndex,
        claimed: false
      });

      const totalWinningShares = winningPositions.reduce((sum, userPosition) => sum + (userPosition.shares || 0), 0);

      const distributionResults = [];

      for (const userPosition of winningPositions) {
        if (totalWinningShares > 0) {
          const shareRatio = (userPosition.shares || 0) / totalWinningShares;
          const winnings = shareRatio * netPool;

          userPosition.payout = parseFloat(winnings.toFixed(8));
          await userPosition.save();

          distributionResults.push({
            userId: userPosition.userId,
            userAddress: userPosition.userAddress,
            originalPosition: userPosition.amount,
            shares: userPosition.shares,
            winnings: userPosition.payout,
            profit: userPosition.payout - userPosition.amount
          });
        }
      }

      logger.info(`Winnings distributed for prediction ${predictionId}:`, {
        totalPool,
        netPool,
        winningPositions: winningPositions.length,
        totalWinningShares,
        distributionResults
      });

      return {
        totalPool,
        netPool,
        platformFee: totalPool * platformFeeRate,
        winningPositions: winningPositions.length,
        totalWinningShares,
        distributions: distributionResults
      };

    } catch (error) {
      logger.error('Error distributing winnings:', error);
      throw error;
    }
  }

  /**
   * Get prediction statistics for a user
   */
  static async getUserPredictionStats(userAddress) {
    try {
      // Use Position model to get user statistics
      const userPositions = await Position.find({
        userAddress: userAddress.toLowerCase()
      }).populate('predictionId', 'isResolved winningOptionIndex');

      let totalPositions = 0;
      let totalWagered = 0;
      let totalWinnings = 0;
      let activePositions = 0;
      let wonPositions = 0;
      let lostPositions = 0;

      for (const userPosition of userPositions) {
        totalPositions++;
        totalWagered += userPosition.amount || 0;

        const prediction = userPosition.predictionId;
        if (prediction && prediction.isResolved) {
          if (userPosition.optionIndex === prediction.winningOptionIndex) {
            wonPositions++;
            totalWinnings += userPosition.payout || 0;
          } else {
            lostPositions++;
          }
        } else {
          activePositions++;
        }
      }

      return {
        totalPositions,
        totalWagered: parseFloat(totalWagered.toFixed(8)),
        totalWinnings: parseFloat(totalWinnings.toFixed(8)),
        netProfit: parseFloat((totalWinnings - totalWagered).toFixed(8)),
        activePositions,
        wonPositions,
        lostPositions,
        winRate: totalPositions > 0 ? parseFloat(((wonPositions / (wonPositions + lostPositions)) * 100).toFixed(2)) : 0,
        roi: totalWagered > 0 ? parseFloat((((totalWinnings - totalWagered) / totalWagered) * 100).toFixed(2)) : 0
      };

    } catch (error) {
      logger.error('Error getting user prediction stats:', error);
      throw error;
    }
  }

  /**
   * Validate positioning constraints before placing a position
   */
  static validatePositioningConstraints(prediction, amount, userAddress) {
    const errors = [];

    // Check prediction status
    if (!prediction.isActive) {
      errors.push('Prediction is not active');
    }

    if (prediction.isResolved) {
      errors.push('Prediction has already been resolved');
    }

    if (new Date() > prediction.endTime) {
      errors.push('Positioning period has ended');
    }

    // Check amount constraints
    if (amount < prediction.minPositionAmount) {
      errors.push(`Minimum position amount is ${prediction.minPositionAmount / 1000000} USDC`);
    }

    if (amount > prediction.maxPositionAmount) {
      errors.push(`Maximum position amount is ${prediction.maxPositionAmount / 1000000} USDC`);
    }

    // Check user's total positioning on this prediction
    // TODO: Implement Position-based user total positioning check
    // const userTotalPositions = await Position.aggregate([
    //   { $match: { predictionId: prediction._id, userAddress: userAddress.toLowerCase() } },
    //   { $group: { _id: null, total: { $sum: '$amount' } } }
    // ]);

    // const maxUserTotal = prediction.maxPositionAmount * 10; // User can position up to 10x max single position
    // if (userTotalPositions.total + amount > maxUserTotal) {
    //   errors.push(`Total positioning limit exceeded. Maximum total: ${maxUserTotal / 1000000} USDC`);
    // }

    return errors;
  }

  /**
   * Get market depth and liquidity information
   */
  static getMarketDepth(prediction) {
    const totalVolume = prediction.totalVolume || 0;
    const optionDepths = prediction.options.map((option, index) => ({
      optionIndex: index,
      title: option.title,
      volume: option.totalAmount || 0,
      shares: option.totalShares || 0,
      price: option.yesPrice || 50,
      percentage: totalVolume > 0 ? Math.round((option.totalAmount / totalVolume) * 100) : 0,
      liquidity: this.calculateLiquidity(option.totalAmount, totalVolume)
    }));

    return {
      totalVolume,
      totalPositions: prediction.totalPositions || 0,
      uniquePredictors: prediction.uniquePredictors || 0,
      options: optionDepths,
      liquidityScore: this.calculateOverallLiquidity(prediction)
    };
  }

  /**
   * Calculate liquidity score for an option
   */
  static calculateLiquidity(optionVolume, totalVolume) {
    if (totalVolume === 0) return 0;

    const volumeRatio = optionVolume / totalVolume;
    // Liquidity is highest when volume is evenly distributed
    const liquidityScore = 1 - Math.abs(volumeRatio - 0.5) * 2;

    return Math.round(liquidityScore * 100);
  }

  /**
   * Calculate overall market liquidity
   */
  static calculateOverallLiquidity(prediction) {
    if (prediction.totalVolume < 10) return 'Low';
    if (prediction.totalVolume < 100) return 'Medium';
    if (prediction.totalVolume < 1000) return 'High';
    return 'Very High';
  }

  /**
   * Simulate positioning outcome and returns
   */
  static simulatePositioning(prediction, optionIndex, amount) {
    const currentPrice = prediction.options[optionIndex].yesPrice || 50;
    const shares = this.calculateShares(amount, currentPrice, prediction.totalVolume);

    // Simulate different scenarios
    const scenarios = [];

    // If this option wins
    const currentOptionShares = prediction.options[optionIndex].totalShares || 0;
    const totalWinningShares = currentOptionShares + shares;
    const potentialWinnings = this.calculatePotentialWinnings(
      shares,
      totalWinningShares,
      prediction.totalVolume + amount
    );

    scenarios.push({
      scenario: 'win',
      probability: currentPrice,
      winnings: potentialWinnings,
      profit: potentialWinnings - amount,
      roi: amount > 0 ? ((potentialWinnings - amount) / amount) * 100 : 0
    });

    // If this option loses
    scenarios.push({
      scenario: 'lose',
      probability: 100 - currentPrice,
      winnings: 0,
      profit: -amount,
      roi: -100
    });

    return {
      positionAmount: amount,
      shares,
      currentPrice,
      scenarios,
      expectedValue: scenarios.reduce((sum, s) =>
        sum + (s.winnings * s.probability / 100), 0
      ) - amount
    };
  }
}

module.exports = PredictionPoolService;