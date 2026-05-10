const Prediction = require('../models/Prediction');
const PredictionHybrid = require('../models/PredictionHybrid');
const Topic = require('../models/Topic');
const { contractService } = require('../services/contractService');
const { logger } = require('../utils/logger');
const { ethers } = require('ethers');
const PredictionPoolService = require('../services/predictionPoolService');
const { AppError } = require('../middleware/errorHandler');
const { findOrCreateUserByWallet, updateUserStats } = require('../services/userService');
const PredictionEvent = require('../models/PredictionEvent');
const Position = require('../models/Position');

// Get all predictions with filtering and pagination
exports.getPredictions = async (req, res, next) => {
  try {
    console.log('🔥 getPredictions function called!');

    const {
      page = 1,
      limit = 20,
      filter = 'all',
      topicId,
      status = 'active',
      search,
    } = req.query;

    console.log('🔍 getPredictions called with params:', { page, limit, filter, topicId, status, search });

    // First, let's check the database connection and see raw data
    const totalDocsInCollection = await Prediction.countDocuments({});
    console.log('📊 Total documents in predictions collection:', totalDocsInCollection);

    // Try to find any prediction without conditions
    const anyPrediction = await Prediction.findOne({});
    console.log('📄 Sample prediction document:', anyPrediction ? anyPrediction.title : 'No predictions found');

    // Build query
    const query = {};
    console.log('📋 Initial query:', query);

    // Filter by status - simplified for testing
    if (status === 'active') {
      query.isActive = true;
      query.isResolved = false;
    } else if (status === 'resolved') {
      query.isResolved = true;
    } else if (status === 'ended') {
      query.endTime = { $lte: new Date() };
    }

    // For debugging: return all predictions without any filters
    // Try hybrid predictions first
    const hybridPredictions = await PredictionHybrid.findActive(parseInt(limit));
    console.log('📋 Found hybrid predictions:', hybridPredictions.length);

    const allPredictions = hybridPredictions.length > 0 ? hybridPredictions : await Prediction.find({}).limit(parseInt(limit));
    console.log('📋 Using predictions:', allPredictions.length, hybridPredictions.length > 0 ? '(hybrid)' : '(legacy)');
    console.log('📄 First prediction title:', allPredictions[0]?.title || 'No predictions');

    // Transform predictions for frontend
    const transformedPredictions = allPredictions.map(prediction => {
      const predictionObj = prediction.toObject();

      // Calculate dynamic prices using market maker algorithm
      const currentPrices = PredictionPoolService.calculateOptionPrices(predictionObj);

      // Fix broken options format and add pricing
      if (predictionObj.options && Array.isArray(predictionObj.options)) {
        predictionObj.options = predictionObj.options.map((option, index) => {
          let optionText;
          let optionData = {};

          if (typeof option === 'string') {
            optionText = option;
          } else if (option && typeof option === 'object') {
            // Preserve existing option data
            optionData = { ...option };

            // Reconstruct string from character array format
            if (option['0'] && option['1']) {
              // It's in broken format like {0: 'Y', 1: 'e', 2: 's'}
              let reconstructed = '';
              let i = 0;
              while (option[i] !== undefined) {
                reconstructed += option[i];
                i++;
              }
              optionText = reconstructed;
            } else {
              optionText = option.title || option.name || 'Option';
            }
          } else {
            optionText = 'Option';
          }

          // Return option with proper structure and dynamic pricing
          return {
            ...optionData,
            title: optionText,
            currentOdds: currentPrices[index] / 100,
            price: currentPrices[index],
            totalAmount: optionData.totalAmount || 0,
            totalShares: optionData.totalShares || 0,
            publicTotalShares: optionData.publicTotalShares || 0,
            encryptedTotalShares: optionData.encryptedTotalShares || null
          };
        });
      }

      return predictionObj;
    });

    console.log('🔥 Sample transformed prediction options:', transformedPredictions[0]?.options);

    return res.status(200).json({
      success: true,
      count: transformedPredictions.length,
      total: transformedPredictions.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(transformedPredictions.length / parseInt(limit)),
      data: {
        predictions: transformedPredictions
      },
    });

    // Filter by topic
    if (topicId) {
      query.topicId = topicId; // FHEVM topics use string IDs
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort criteria
    let sort = {};
    switch (filter) {
      case 'trending':
        sort = { volume: -1, createdAt: -1 };
        break;
      case 'new':
        sort = { createdAt: -1 };
        break;
      case 'ending-soon':
        query.endTime = { $gt: new Date(), $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
        sort = { endTime: 1 };
        break;
      case 'volume':
        sort = { volume: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('🔍 Final query:', JSON.stringify(query, null, 2));
    console.log('📄 Sort:', JSON.stringify(sort, null, 2));

    const predictions = await Prediction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prediction.countDocuments(query);

    console.log('📊 Query results:', { predictionsFound: predictions.length, total });

    res.status(200).json({
      success: true,
      count: predictions.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: { predictions },
    });
  } catch (error) {
    next(error);
  }
};

// Get single prediction
exports.getPrediction = async (req, res, next) => {
  try {
    console.log('🔍 getPrediction called for ID:', req.params.id);

    let prediction;

    // Check if ID is numeric (contract ID) or MongoDB ObjectId
    if (/^\d+$/.test(req.params.id)) {
      // Numeric ID - search by contractId
      prediction = await Prediction.findOne({ contractId: parseInt(req.params.id) });
    } else {
      // MongoDB ObjectId - search by _id
      prediction = await Prediction.findById(req.params.id);
    }

    if (!prediction) {
      console.log('❌ Prediction not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Prediction not found',
      });
    }

    console.log('✅ Prediction found:', prediction.title, 'TopicId:', prediction.topicId);

    // Get topic separately to avoid populate issues
    let topic = null;
    if (prediction.topicId) {
      try {
        const Topic = require('../models/Topic');
        topic = await Topic.findById(prediction.topicId).select('name imageUrl level parentId');
        console.log('📁 Topic found:', topic?.name || 'No topic found');
      } catch (topicError) {
        console.log('⚠️ Topic lookup failed:', topicError.message);
      }
    }

    // Get related predictions from same topic
    const relatedPredictions = await Prediction.find({
      topicId: prediction.topicId,
      _id: { $ne: prediction._id },
      isActive: true,
      isResolved: false,
    }).limit(3);

    console.log('🔗 Related predictions found:', relatedPredictions.length);

    // Transform prediction data (same as getPredictions)
    const predictionObj = prediction.toObject();

    // Calculate dynamic prices using market maker algorithm
    const currentPrices = PredictionPoolService.calculateOptionPrices(predictionObj);

    // Fix broken options format and add pricing
    if (predictionObj.options && Array.isArray(predictionObj.options)) {
      predictionObj.options = predictionObj.options.map((option, index) => {
        let optionText;
        let optionData = {};

        if (typeof option === 'string') {
          optionText = option;
        } else if (option && typeof option === 'object') {
          // Preserve existing option data
          optionData = { ...option };

          // Reconstruct string from character array format
          if (option['0'] && option['1']) {
            // It's in broken format like {0: 'Y', 1: 'e', 2: 's'}
            let reconstructed = '';
            let i = 0;
            while (option[i] !== undefined) {
              reconstructed += option[i];
              i++;
            }
            optionText = reconstructed;
          } else {
            optionText = option.title || option.name || 'Option';
          }
        } else {
          optionText = 'Option';
        }

        // Return option with proper structure and dynamic pricing
        return {
          ...optionData,
          title: optionText,
          currentOdds: currentPrices[index] / 100,
          price: currentPrices[index],
          totalAmount: optionData.totalAmount || 0,
          totalShares: optionData.totalShares || 0,
          publicTotalShares: optionData.publicTotalShares || 0,
          encryptedTotalShares: optionData.encryptedTotalShares || null
        };
      });
    }

    // Add topic to prediction response
    const predictionWithTopic = predictionObj;
    if (topic) {
      predictionWithTopic.topic = topic;
    }

    res.status(200).json({
      success: true,
      data: {
        prediction: predictionWithTopic,
        relatedPredictions,
      },
    });
  } catch (error) {
    console.error('❌ Error in getPrediction:', error);
    next(error);
  }
};

// Search predictions
exports.searchPredictions = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const predictions = await Prediction.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .populate('topic', 'name')
      .sort({ volume: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: predictions.length,
      data: { predictions },
    });
  } catch (error) {
    next(error);
  }
};

// Get predictions by topic
exports.getPredictionsByTopic = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if topic exists
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const predictions = await Prediction.find({
      topicId: topicId, // FHEVM topics use string IDs
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prediction.countDocuments({
      topicId: topicId, // FHEVM topics use string IDs
      isActive: true,
    });

    res.status(200).json({
      success: true,
      count: predictions.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: {
        predictions,
        topic,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Submit a position
exports.submitPosition = async (req, res, next) => {
  try {
    console.log('🎯 submitPosition called with:');
    console.log('   Prediction ID:', req.params.id);
    console.log('   Request Body:', JSON.stringify(req.body, null, 2));
    console.log('   Headers:', req.headers);

    const { id } = req.params;
    const {
      optionIndex,
      amount,
      txHash,
      userAddress,
      // FHEVM encrypted data
      encryptedAmount,
      encryptedProof,
      fhevmHandles,
      fhevmInputProof,
      isFHEVMEncrypted,
      contractAddress
    } = req.body;

    // Get the prediction with proper validation (same logic as getPrediction)
    let prediction;

    // Check if ID is numeric (contract ID) or MongoDB ObjectId
    if (/^\d+$/.test(id)) {
      // Numeric ID - search by contractId
      prediction = await Prediction.findOne({ contractId: parseInt(id) });
    } else {
      // MongoDB ObjectId - search by _id
      prediction = await Prediction.findById(id);
    }

    if (!prediction) {
      throw new AppError('Prediction not found', 404);
    }

    // Get wallet address from request body (frontend sends this)
    const resolvedUserAddress = userAddress ? userAddress.toLowerCase() : req.user?.address?.toLowerCase();

    // Validate Ethereum address is provided
    if (!resolvedUserAddress) {
      throw new AppError('Wallet address is required for prediction', 400);
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(resolvedUserAddress)) {
      throw new AppError('Invalid Ethereum address format', 400);
    }

    // Find or create user by wallet address (production-ready authentication)
    console.log(`🔐 Authenticating user with wallet: ${resolvedUserAddress}`);
    console.log(`   UserAddress type: ${typeof resolvedUserAddress}`);
    console.log(`   UserAddress value: "${resolvedUserAddress}"`);

    const user = await findOrCreateUserByWallet(resolvedUserAddress);
    console.log(`✅ User found/created:`, {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName
    });
    const userId = user.id;

    // Validate prediction constraints using the service
    const validationErrors = PredictionPoolService.validatePredictionConstraints(prediction, amount, resolvedUserAddress);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors.join(', '), 400);
    }

    // Calculate current price and shares using the service
    const currentPrices = PredictionPoolService.calculateOptionPrices(prediction);
    const currentPrice = currentPrices[optionIndex];
    const shares = PredictionPoolService.calculateShares(amount, currentPrice, prediction.totalVolume);

    // Simulate the prediction outcome
    const simulation = PredictionPoolService.simulatePrediction(prediction, optionIndex, amount);

    // Log FHEVM encryption details
    if (isFHEVMEncrypted) {
      logger.info(`FHEVM encrypted prediction received:`, {
        encryptedAmount: encryptedAmount ? 'present' : 'missing',
        fhevmHandles: fhevmHandles ? fhevmHandles.length : 0,
        contractAddress
      });
    }

    // Create user position with all required fields including FHEVM data
    const userPosition = {
      userId,
      userAddress: resolvedUserAddress,
      optionIndex: parseInt(optionIndex),
      amount: parseFloat(amount),
      shares: parseFloat(shares),
      price: currentPrice,
      txHash,
      timestamp: new Date(),
      claimed: false,
      winnings: 0,
      // FHEVM encrypted data
      isFHEVMEncrypted: !!isFHEVMEncrypted,
      encryptedAmount: encryptedAmount || null,
      encryptedProof: encryptedProof || null,
      fhevmHandles: fhevmHandles || null,
      fhevmInputProof: fhevmInputProof || null,
      contractAddress: contractAddress || null
    };

    // Use the prediction model's submitPosition method for consistency
    await prediction.submitPosition(
      userPosition.userAddress,
      userPosition.optionIndex,
      userPosition.amount,
      userPosition.shares,
      userPosition.txHash,
      userId
    );

    // Update market prices after the position
    const newPrices = await PredictionPoolService.updatePredictionPrices(id, optionIndex, amount);

    // Get updated market depth
    const marketDepth = PredictionPoolService.getMarketDepth(prediction);

    // Update user statistics for this prediction
    try {
      await updateUserStats(resolvedUserAddress, amount, false); // false = not won yet
      console.log(`📊 Updated user stats for ${resolvedUserAddress}: +${amount} volume`);
    } catch (statsError) {
      console.error('❌ Error updating user stats:', statsError);
      // Don't fail the position submission if stats update fails
    }

    const logMessage = isFHEVMEncrypted
      ? `FHEVM encrypted position submitted: User ${userId}, Address ${resolvedUserAddress}, Prediction ${id}, Option ${optionIndex}, Amount ${amount}, Shares ${shares}`
      : `Position submitted: User ${userId}, Address ${resolvedUserAddress}, Prediction ${id}, Option ${optionIndex}, Amount ${amount}, Shares ${shares}`;

    logger.info(logMessage);

    const responseMessage = isFHEVMEncrypted
      ? 'FHEVM encrypted position submitted successfully'
      : 'Position submitted successfully';

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        userPosition,
        simulation,
        marketUpdate: {
          newPrices,
          marketDepth
        },
        transaction: {
          shares,
          priceAtPurchase: currentPrice,
          expectedValue: simulation.expectedValue
        },
        fhevm: {
          isEncrypted: !!isFHEVMEncrypted,
          contractAddress: contractAddress || null
        }
      },
    });
  } catch (error) {
    logger.error('Error submitting position:', error);
    next(error);
  }
};

// Claim winnings
exports.claimWinnings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { txHash, userAddress } = req.body;

    // Get wallet address
    const resolvedUserAddress = userAddress ? userAddress.toLowerCase() : req.user?.address?.toLowerCase();

    // Validate wallet address
    if (!resolvedUserAddress || !ethers.isAddress(resolvedUserAddress)) {
      throw new AppError('Valid wallet address is required for claiming winnings', 400);
    }

    // Find or create user by wallet address
    console.log(`🔐 Authenticating user for claim: ${resolvedUserAddress}`);
    const user = await findOrCreateUserByWallet(resolvedUserAddress);
    const userId = user.id;

    let prediction;

    // Check if ID is numeric (contract ID) or MongoDB ObjectId
    if (/^\d+$/.test(id)) {
      // Numeric ID - search by contractId
      prediction = await Prediction.findOne({ contractId: parseInt(id) });
    } else {
      // MongoDB ObjectId - search by _id
      prediction = await Prediction.findById(id);
    }

    if (!prediction) {
      throw new AppError('Prediction not found', 404);
    }

    if (!prediction.isResolved) {
      throw new AppError('Prediction is not resolved yet', 400);
    }

    // Calculate winnings using the prediction pool service
    const totalWinnings = prediction.calculateWinnings(resolvedUserAddress);

    if (totalWinnings <= 0) {
      throw new AppError('No winnings available to claim', 400);
    }

    // Check if already claimed using Position model
    const userWinningPositions = await Position.find({
      predictionId: prediction._id,
      userAddress: resolvedUserAddress,
      optionIndex: prediction.winningOptionIndex,
      claimed: false
    });

    if (userWinningPositions.length === 0) {
      throw new AppError('No winning positions found or already claimed', 400);
    }

    // Update user's winning positions
    let claimedAmount = 0;
    for (const position of userWinningPositions) {
      position.claimed = true;
      position.claimTxHash = txHash;
      position.payout = totalWinnings;
      await position.save();
      claimedAmount += totalWinnings;
    }

    // Update user statistics with winnings
    try {
      await updateUserStats(resolvedUserAddress, claimedAmount, true); // true = won
      console.log(`🎉 Updated winning stats for ${resolvedUserAddress}: +${claimedAmount} winnings`);
    } catch (statsError) {
      console.error('❌ Error updating winning stats:', statsError);
      // Don't fail the claim if stats update fails
    }

    // Get user's prediction statistics
    const userStats = await PredictionPoolService.getUserPredictionStats(resolvedUserAddress);

    logger.info(`Winnings claimed: User ${userId}, Address ${resolvedUserAddress}, Prediction ${id}, Amount ${claimedAmount}`);

    res.status(200).json({
      success: true,
      message: 'Winnings claimed successfully',
      data: {
        claimedAmount: totalWinnings,
        txHash,
        userStats,
        predictionDetails: {
          predictionTitle: prediction.title,
          winningOption: prediction.options[prediction.winningOptionIndex].title,
          totalPool: prediction.totalVolume,
          platformFee: prediction.totalVolume * 0.02
        }
      }
    });
  } catch (error) {
    logger.error('Error claiming winnings:', error);
    next(error);
  }
};

// Get user's positions
exports.getUserPositions = async (req, res, next) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20, status = 'all' } = req.query;

    const query = { userAddress: address.toLowerCase() };
    
    if (status === 'active') {
      query.status = 'active';
    } else if (status === 'resolved') {
      query.isResolved = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const userPositions = await Position.find(query)
      .populate('predictionId', 'title description endTime isResolved useFHEVM options winningOptionIndex')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Position.countDocuments(query);

    // Get user prediction statistics
    const userStats = await PredictionPoolService.getUserPredictionStats(address);

    res.status(200).json({
      success: true,
      count: userPositions.length,
      total,
      data: {
        positions: userPositions,
        statistics: userStats
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get market depth and prediction statistics for a prediction
exports.getPredictionMarketData = async (req, res, next) => {
  try {
    const { id } = req.params;

    let prediction;

    // Check if ID is numeric (contract ID) or MongoDB ObjectId
    if (/^\d+$/.test(id)) {
      // Numeric ID - search by contractId
      prediction = await Prediction.findOne({ contractId: parseInt(id) });
    } else {
      // MongoDB ObjectId - search by _id
      prediction = await Prediction.findById(id);
    }

    if (!prediction) {
      throw new AppError('Prediction not found', 404);
    }

    // Get market depth information
    const marketDepth = PredictionPoolService.getMarketDepth(prediction);

    // Calculate current prices
    const currentPrices = PredictionPoolService.calculateOptionPrices(prediction);

    // Get prediction history summary from Position model
    const recentPositions = await Position.find({ predictionId: prediction._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount optionIndex createdAt entryPrice')
      .then(positions => positions.map(position => ({
        amount: position.amount,
        optionIndex: position.optionIndex,
        timestamp: position.createdAt,
        price: position.entryPrice
      })));

    res.status(200).json({
      success: true,
      data: {
        marketDepth,
        currentPrices,
        recentActivity: recentPositions,
        summary: {
          totalVolume: prediction.totalVolume,
          totalPositions: prediction.totalPositions,
          uniquePredictors: prediction.uniquePredictors,
          timeRemaining: prediction.endTime.getTime() - Date.now(),
          isActive: prediction.isActive && !prediction.isResolved && new Date() < prediction.endTime
        }
      }
    });
  } catch (error) {
    logger.error('Error getting prediction market data:', error);
    next(error);
  }
};

// Simulate prediction outcome
exports.simulatePrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { optionIndex, amount } = req.body;

    if (optionIndex === undefined || !amount) {
      throw new AppError('Option index and amount are required', 400);
    }

    let prediction;

    // Check if ID is numeric (contract ID) or MongoDB ObjectId
    if (/^\d+$/.test(id)) {
      // Numeric ID - search by contractId
      prediction = await Prediction.findOne({ contractId: parseInt(id) });
    } else {
      // MongoDB ObjectId - search by _id
      prediction = await Prediction.findById(id);
    }

    if (!prediction) {
      throw new AppError('Prediction not found', 404);
    }

    if (optionIndex < 0 || optionIndex >= prediction.options.length) {
      throw new AppError('Invalid option index', 400);
    }

    // Simulate the prediction outcome
    const simulation = PredictionPoolService.simulatePrediction(prediction, optionIndex, amount);

    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error('Error simulating prediction:', error);
    next(error);
  }
};

// Get user prediction statistics
exports.getUserPredictionStats = async (req, res, next) => {
  try {
    const { address } = req.params;

    // Get all user positions for statistics using Position model
    const userPositions = await Position.find({ userAddress: address.toLowerCase() })
      .populate('predictionId', 'isResolved winningOptionIndex');

    // Calculate statistics
    let totalPositions = userPositions.length;
    let totalInvested = 0;
    let totalWinnings = 0;
    let wonPositions = 0;

    userPositions.forEach(position => {
      totalInvested += position.amount || 0;

      if (position.predictionId?.isResolved && 
          position.predictionId?.winningOptionIndex === position.optionIndex) {
        wonPositions++;
        totalWinnings += position.payout || 0;
      }
    });

    const winRate = totalPositions > 0 ? (wonPositions / totalPositions) * 100 : 0;
    const profitLoss = totalWinnings - totalInvested;

    const stats = {
      totalPositions,
      totalInvested,
      totalWinnings,
      winRate,
      profitLoss,
      wonPositions,
      lostPositions: totalPositions - wonPositions
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user prediction stats:', error);
    next(error);
  }
};

// Get prediction statistics using PredictionEvent model (FHEVM-aware)
exports.getPredictionStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Prediction ID is required'
      });
    }

    // Get statistics from PredictionEvent model (includes decrypted amounts)
    const stats = await PredictionEvent.getPredictionStatistics(id);

    // Also get option-wise statistics from Position
    const optionStats = await Position.aggregate([
      {
        $match: {
          predictionId: require('mongoose').Types.ObjectId(id),
          amount: { $ne: null } // Only include decrypted positions
        }
      },
      {
        $group: {
          _id: '$optionIndex',
          totalAmount: { $sum: '$amount' },
          totalPositions: { $sum: 1 },
          uniquePredictors: { $addToSet: '$userAddress' }
        }
      },
      {
        $project: {
          optionIndex: '$_id',
          totalAmount: 1,
          totalPositions: 1,
          uniquePredictors: { $size: '$uniquePredictors' }
        }
      },
      {
        $sort: { optionIndex: 1 }
      }
    ]);

    // Get recent activity (last 10 positions)
    const recentActivity = await Position.find({
      predictionId: require('mongoose').Types.ObjectId(id)
    })
    .populate('userId', 'username')
    .select('optionIndex amount entryPrice createdAt userAddress')
    .sort({ createdAt: -1 })
    .limit(10);

    // Calculate time remaining
    const prediction = await Prediction.findById(id).select('endTime');
    const now = new Date();
    const timeRemaining = prediction?.endTime ? Math.max(0, prediction.endTime.getTime() - now.getTime()) : 0;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    logger.info(`📊 Prediction statistics retrieved for prediction ${id}:`, {
      totalVolume: stats.totalVolume,
      totalPositions: stats.totalPositions,
      uniquePredictors: stats.uniquePredictors,
      optionCount: optionStats.length,
      hoursRemaining
    });

    res.status(200).json({
      success: true,
      data: {
        // Overall stats
        totalVolume: stats.totalVolume || 0,
        totalPositions: stats.totalPositions || 0,
        uniquePredictors: stats.uniquePredictors || 0,
        hoursRemaining,

        // Option-wise breakdown
        optionStats: optionStats.map(opt => ({
          optionIndex: opt.optionIndex,
          totalAmount: opt.totalAmount,
          totalPositions: opt.totalPositions,
          uniquePredictors: opt.uniquePredictors,
          percentage: stats.totalVolume > 0 ? (opt.totalAmount / stats.totalVolume * 100).toFixed(1) : 0
        })),

        // Recent activity (privacy-aware)
        recentActivity: recentActivity.map(position => ({
          userAddress: position.userAddress.substring(0, 6) + '...' + position.userAddress.substring(38), // Anonymize
          optionIndex: position.optionIndex,
          amount: position.amount, // Only visible if decrypted
          entryPrice: position.entryPrice,
          timestamp: position.createdAt
        }))
      }
    });

  } catch (error) {
    logger.error('Error getting prediction statistics:', error);
    next(error);
  }
};

module.exports = exports;