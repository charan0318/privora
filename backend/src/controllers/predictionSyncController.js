const Prediction = require('../models/Prediction');
const { ethers } = require('ethers');

// Sync predictions from contract to database
exports.syncPredictionsFromContract = async (req, res) => {
  try {
    const { contractAddress, rpcUrl, contractABI, chainId } = req.body;

    if (!contractAddress || !rpcUrl || !contractABI) {
      return res.status(400).json({
        success: false,
        message: 'Contract address, RPC URL, and ABI are required'
      });
    }

    // Connect to contract
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Get total predictions count
    const totalPredictions = Number(await contract.getTotalPredictions());

    if (totalPredictions === 0) {
      return res.status(200).json({
        success: true,
        message: 'No predictions found in contract',
        synced: 0,
        updated: 0,
        failed: 0
      });
    }

    let synced = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    // Sync each prediction
    for (let i = 1; i <= totalPredictions; i++) {
      try {
        // Get prediction from contract
        const contractPrediction = await contract.getPrediction(i);

        // Get options separately (they're stored in a different mapping)
        const optionCount = Number(contractPrediction.optionCount);
        const options = [];
        for (let j = 0; j < optionCount; j++) {
          try {
            const option = await contract.getPredictionOption(i, j);
            options.push({
              title: option.title || `Option ${j + 1}`,
              isWinner: option.isWinner || false,
              publicTotalShares: Number(option.publicTotalShares || 0),
              currentPrice: 50, // Default price
              description: ''
            });
          } catch (optErr) {
            console.warn(`Could not get option ${j} for prediction ${i}:`, optErr.message);
          }
        }

        // Get prediction statistics
        // Note: totalParticipants is encrypted (euint32), needs decryption
        // For now, we'll use getTotalPredictionCount which is public
        let totalPredictionsCount = 0;
        try {
          totalPredictionsCount = Number(await contract.getTotalPredictionCount(i));
        } catch (e) {
          console.warn(`Could not get prediction count for prediction ${i}`);
          totalPredictionsCount = 0;
        }

        // Calculate unique participants from hasPlacedPrediction events or leave as 0
        // This would require event parsing which is complex
        // For now, set to 0 and let frontend handle it if needed
        const totalParticipants = 0; // TODO: Decrypt encrypted value or count from events

        // Parse prediction data
        const predictionData = {
          contractId: i,
          contractAddress: contractAddress.toLowerCase(),
          title: contractPrediction.title || `Prediction #${i}`,
          description: contractPrediction.description || '',
          predictionType: Number(contractPrediction.predictionType),
          options: options,
          endTime: new Date(Number(contractPrediction.endTime) * 1000),
          isActive: contractPrediction.isActive,
          isResolved: contractPrediction.isResolved || false,
          createdBy: contractPrediction.createdBy ? contractPrediction.createdBy.toLowerCase() : '0x0000000000000000000000000000000000000000',
          minPositionAmount: Number(contractPrediction.minPositionAmount || 0),
          maxPositionAmount: Number(contractPrediction.maxPositionAmount || 0),
          totalParticipants: totalParticipants,
          totalPredictions: totalPredictionsCount,
          totalShares: 0, // This might need separate calculation
          winningOptionIndex: null, // Will be set on resolution
          lastSyncAt: new Date(),
          syncStatus: 'synced',
          useFHEVM: true,
          encryptionMetadata: {
            chainId: chainId || 11155111
          }
        };

        // Check if prediction exists
        const existingPrediction = await Prediction.findOne({ contractId: i });

        if (existingPrediction) {
          // Update existing prediction (preserve topic and other admin data)
          await Prediction.findOneAndUpdate(
            { contractId: i },
            {
              $set: {
                ...predictionData,
                topicId: existingPrediction.topicId, // Preserve topic
                imageUrl: existingPrediction.imageUrl, // Preserve image
                tags: existingPrediction.tags, // Preserve tags
                featured: existingPrediction.featured, // Preserve featured status
                priority: existingPrediction.priority, // Preserve priority
                visibility: existingPrediction.visibility, // Preserve visibility
                marketGroup: existingPrediction.marketGroup // Preserve grouping
              }
            },
            { upsert: false, new: true }
          );
          updated++;
        } else {
          // Create new prediction with default topicId
          const newPrediction = new Prediction({
            ...predictionData,
            topicId: 'uncategorized' // Default topic
          });
          await newPrediction.save();
          synced++;
        }

      } catch (error) {
        console.error(`Error syncing prediction ${i}:`, error);
        failed++;
        errors.push({ predictionId: i, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${synced} new predictions, updated ${updated} existing predictions${failed > 0 ? `, ${failed} failed` : ''}`,
      synced,
      updated,
      failed,
      total: totalPredictions,
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });

  } catch (error) {
    console.error('Prediction sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync predictions from contract',
      error: error.message
    });
  }
};

// Get all predictions from database
exports.getAllPredictions = async (req, res) => {
  try {
    const { topic, isActive, isResolved, limit = 100, page = 1 } = req.query;

    const filter = {};
    if (topic) filter.topicId = topic;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Prediction.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: predictions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions',
      error: error.message
    });
  }
};

// Get prediction by contractId
exports.getPredictionByContractId = async (req, res) => {
  try {
    const { contractId } = req.params;

    const prediction = await Prediction.findOne({ contractId: parseInt(contractId) });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prediction
    });

  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prediction',
      error: error.message
    });
  }
};

// Update prediction topic
exports.updatePredictionTopic = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { topicId } = req.body;

    const prediction = await Prediction.findOneAndUpdate(
      { contractId: parseInt(contractId) },
      { $set: { topicId, updatedAt: new Date() } },
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Prediction topic updated successfully'
    });

  } catch (error) {
    console.error('Update prediction topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prediction topic',
      error: error.message
    });
  }
};

// Get predictions by topic
exports.getPredictionsByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    const predictions = await Prediction.find({
      topicId,
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: predictions
    });

  } catch (error) {
    console.error('Get predictions by topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions by topic',
      error: error.message
    });
  }
};

// Update prediction image (URL)
exports.updatePredictionImage = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { imageUrl } = req.body;

    const prediction = await Prediction.findOneAndUpdate(
      { contractId: parseInt(contractId) },
      { $set: { imageUrl, updatedAt: new Date() } },
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Prediction image updated successfully'
    });

  } catch (error) {
    console.error('Update prediction image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prediction image',
      error: error.message
    });
  }
};

// Upload prediction image (File Upload)
exports.uploadPredictionImage = async (req, res) => {
  try {
    const { contractId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Generate relative path only
    const imageUrl = `/uploads/prediction-images/${req.file.filename}`;

    // Update prediction with new image URL
    const prediction = await Prediction.findOneAndUpdate(
      { contractId: parseInt(contractId) },
      { $set: { imageUrl, updatedAt: new Date() } },
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prediction,
      imageUrl: imageUrl,
      message: 'Prediction image uploaded successfully'
    });

  } catch (error) {
    console.error('Upload prediction image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload prediction image',
      error: error.message
    });
  }
};

// Resolve prediction (admin only)
exports.resolvePrediction = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { winnerIndex, contractAddress, rpcUrl, contractABI } = req.body;

    // Get admin private key from backend env (SECURE)
    const adminPrivateKey = process.env.PRIVATE_KEY;

    // Get prediction from database
    const prediction = await Prediction.findOne({ contractId: parseInt(contractId) });
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if already resolved
    if (prediction.isResolved) {
      return res.status(400).json({
        success: false,
        message: 'Prediction is already resolved'
      });
    }

    // Note: Removed endTime check for testing purposes
    // Admin can manually resolve predictions even if they're still active
    // const now = Date.now();
    // if (prediction.endTime > now) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Prediction has not ended yet'
    //   });
    // }

    // Call contract to resolve
    const ethers = require('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    const tx = await contract.resolvePrediction(contractId, winnerIndex);
    await tx.wait();

    // Update database
    const updatedOptions = prediction.options.map((opt, idx) => ({
      ...opt,
      isWinner: idx === winnerIndex
    }));

    prediction.isResolved = true;
    prediction.options = updatedOptions;
    prediction.updatedAt = new Date();
    await prediction.save();

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Prediction resolved successfully',
      txHash: tx.hash
    });

  } catch (error) {
    console.error('Resolve prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve prediction',
      error: error.message
    });
  }
};

// Resolve nested prediction (admin only)
exports.resolveNestedPrediction = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { optionIndex, outcome, contractAddress, rpcUrl, contractABI } = req.body;

    // Get admin private key from backend env (SECURE)
    const adminPrivateKey = process.env.PRIVATE_KEY;

    // Validate private key exists
    if (!adminPrivateKey) {
      return res.status(500).json({
        success: false,
        message: 'Admin private key not configured in backend'
      });
    }

    console.log('🔑 Private key loaded:', adminPrivateKey ? 'YES (length: ' + adminPrivateKey.length + ')' : 'NO');

    // Get prediction from database
    const prediction = await Prediction.findOne({ contractId: parseInt(contractId) });
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if already resolved
    if (prediction.isResolved) {
      return res.status(400).json({
        success: false,
        message: 'Prediction is already resolved'
      });
    }

    // Call contract to resolve
    const ethers = require('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    const tx = await contract.resolveNestedPrediction(contractId, optionIndex, outcome);
    await tx.wait();

    // Update database
    const updatedOptions = prediction.options.map((opt, idx) => {
      if (idx === optionIndex) {
        return { ...opt, isWinner: true };
      }
      return opt;
    });

    prediction.isResolved = true;
    prediction.options = updatedOptions;
    prediction.updatedAt = new Date();
    await prediction.save();

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Nested prediction resolved successfully',
      txHash: tx.hash
    });

  } catch (error) {
    console.error('Resolve nested prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve nested prediction',
      error: error.message
    });
  }
};

module.exports = exports;