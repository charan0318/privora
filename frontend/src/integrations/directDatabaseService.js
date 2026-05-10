// Smart Contract Service for FHEVM Data
// Fetches data directly from deployed smart contracts

import { contractService } from './contractService.js';

// Topic mapping from contract IDs to display data
const TOPIC_MAPPING = {
  '1': {
    _id: '1',
    name: 'Politics',
    description: 'Political events and election predictions with private voting',
    imageUrl: '🗳️',
    parentCategory: null,
    displayOrder: 1,
    isActive: true,
    fhevmEnabled: true
  },
  '2': {
    _id: '2',
    name: 'Cryptocurrency',
    description: 'Digital currency and blockchain predictions with FHEVM privacy',
    imageUrl: '🪙',
    parentCategory: null,
    displayOrder: 2,
    isActive: true,
    fhevmEnabled: true
  },
  '3': {
    _id: '3',
    name: 'Sports',
    description: 'Sports events and tournament predictions',
    imageUrl: '⚽',
    parentCategory: null,
    displayOrder: 3,
    isActive: true,
    fhevmEnabled: false
  },
  '4': {
    _id: '4',
    name: 'Economics',
    description: 'Economic events and market predictions',
    imageUrl: '📊',
    parentCategory: null,
    displayOrder: 4,
    isActive: true,
    fhevmEnabled: true
  },
  '5': {
    _id: '5',
    name: 'Science',
    description: 'Scientific discoveries and research predictions',
    imageUrl: '🔬',
    parentCategory: null,
    displayOrder: 5,
    isActive: true,
    fhevmEnabled: true
  },
  '6': {
    _id: '6',
    name: 'Entertainment',
    description: 'Movies, TV shows, and celebrity predictions',
    imageUrl: '🎬',
    parentCategory: null,
    displayOrder: 6,
    isActive: true,
    fhevmEnabled: false
  },
  '7': {
    _id: '7',
    name: 'Technology',
    description: 'Tech company and innovation predictions with FHEVM privacy',
    imageUrl: '💻',
    parentCategory: null,
    displayOrder: 7,
    isActive: true,
    fhevmEnabled: true
  }
};


// Service functions to fetch data from smart contracts
export const directDatabaseService = {
  // Get topics from contract or mapping
  async getTopics() {
    try {
      console.log('📂 Smart Contract: Getting topics...');

      // Try to get topics from contract first
      if (contractService && contractService.isInitialized) {
        try {
          const contractTopics = await contractService.getTopics();

          // Transform and merge with our display mapping
          const topics = contractTopics.map(topic => {
            const mappedData = TOPIC_MAPPING[topic.id.toString()] || {};
            return {
              ...mappedData,
              _id: topic.id.toString(),
              name: topic.name || mappedData.name,
              predictionCount: 0, // Will be calculated from predictions
              totalVolume: 0 // Encrypted on contract
            };
          });

          return {
            success: true,
            data: topics
          };
        } catch (contractError) {
          console.warn('Contract topics failed, using fallback:', contractError.message);
        }
      }

      // Fallback to mapping data
      const topics = Object.values(TOPIC_MAPPING);
      return {
        success: true,
        data: topics
      };
    } catch (error) {
      console.error('❌ Topics Error:', error);
      throw error;
    }
  },

  // Get predictions from smart contract
  async getPredictions(params = {}) {
    try {
      console.log('🎯 Smart Contract: Getting predictions...', params);

      // Try to use read-only contract service
      if (!contractService.isInitialized && !contractService.isReadOnlyInitialized) {
        console.log('📡 Initializing read-only contract service...');
        await contractService.initializeReadOnly();
      }

      if (!contractService.isInitialized && !contractService.isReadOnlyInitialized) {
        console.error('Failed to initialize contract service');
        return {
          success: true,
          count: 0,
          total: 0,
          data: { predictions: [] }
        };
      }

      let predictions = [];

      try {
        // Get predictions based on parameters
        if (params.topicId) {
          // Get predictions by topic
          predictions = await contractService.getPredictionsByTopic(params.topicId);
        } else {
          // Get all active predictions
          predictions = await contractService.getActivePredictions();
        }
      } catch (contractError) {
        console.warn('Contract getPredictions failed, using fallback data:', contractError.message);
        predictions = []; // Set to empty to trigger fallback
      }

      // If no predictions returned or empty array, use fallback
      if (!predictions || predictions.length === 0) {
        console.warn('Contract returned no predictions, using fallback data');

        // Fallback: We know we have 2 predictions on the contract, create minimal data
        predictions = [
          {
            id: '1',
            title: '2026 Midterm Elections Winner - Private Voting',
            description: 'Anonymous prediction market for the 2026 US Midterm Elections using FHEVM technology. Your vote and bet amount remain private until resolution.',
            imageUrl: '',
            topicId: '1',
            endTime: new Date('2026-11-08T00:00:00Z'),
            isActive: true,
            isResolved: false,
            createdAt: new Date('2024-12-01T00:00:00Z'),
            updatedAt: new Date('2024-12-01T00:00:00Z'),
            mustShowLive: false,
            liveStartTime: null,
            liveEndTime: null,
            predictionType: 2,
            minPositionAmount: 1,
            maxPositionAmount: 10000,
            createdBy: 'benim_adresim',
            totalParticipants: 0,
            volume: 8750
          },
          {
            id: '2',
            title: 'Will Bitcoin reach $150,000 by end of 2025?',
            description: 'Private prediction market for Bitcoin reaching the $150k milestone by December 31, 2025. Uses FHEVM for encrypted bet amounts and private voting.',
            imageUrl: '',
            topicId: '2',
            endTime: new Date('2025-12-31T23:59:59Z'),
            isActive: true,
            isResolved: false,
            createdAt: new Date('2024-12-01T00:00:00Z'),
            updatedAt: new Date('2024-12-01T00:00:00Z'),
            mustShowLive: false,
            liveStartTime: null,
            liveEndTime: null,
            predictionType: 2,
            minPositionAmount: 1,
            maxPositionAmount: 10000,
            createdBy: 'benim_adresim',
            totalParticipants: 0,
            volume: 8750
          }
        ];

        // Filter by topic if needed
        if (params.topicId) {
          predictions = predictions.filter(prediction => prediction.topicId === params.topicId.toString());
        }
      }

      // Transform contract data to expected API format
      const transformedPredictions = predictions.map(prediction => ({
        _id: (prediction._id || prediction.id || '').toString(),
        title: prediction.title,
        description: prediction.description || '',
        imageUrl: prediction.imageUrl || '',
        topicId: prediction.topicId.toString(),
        isActive: prediction.isActive,
        isResolved: prediction.isResolved,
        endTime: prediction.endTime.toISOString(),
        resolvedAt: prediction.isResolved ? prediction.endTime.toISOString() : null,
        predictionType: prediction.predictionType || 2,
        useFHEVM: true, // All our predictions use FHEVM
        fhevmContractAddress: contractService.getContractAddress('PREDICTION_HUB'),
        minPositionAmount: prediction.minPositionAmount || 1,
        maxPositionAmount: prediction.maxPositionAmount || 10000,
        createdBy: prediction.createdBy || '0x0000000000000000000000000000000000000000',
        mustShowLive: prediction.mustShowLive || false,
        liveStartTime: prediction.liveStartTime ? prediction.liveStartTime.toISOString() : null,
        liveEndTime: prediction.liveEndTime ? prediction.liveEndTime.toISOString() : null,
        options: prediction.options || [
          {
            title: "Yes",
            encryptedTotalShares: "fhevm_encrypted_value",
            publicTotalShares: 0,
            currentOdds: 1,
            isWinner: false,
            yesPrice: 50,
            percentage: 50
          },
          {
            title: "No",
            encryptedTotalShares: "fhevm_encrypted_value",
            publicTotalShares: 0,
            currentOdds: 1,
            isWinner: false,
            yesPrice: 50,
            percentage: 50
          }
        ],
        totalParticipants: prediction.totalParticipants || 0,
        encryptedTotalVolume: "fhevm_encrypted_volume",
        publicTotalVolume: 0, // Encrypted on contract
        volume: 12500, // Mock volume for display
        createdAt: prediction.createdAt ? prediction.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: prediction.updatedAt ? prediction.updatedAt.toISOString() : new Date().toISOString()
      }));

      return {
        success: true,
        count: transformedPredictions.length,
        total: transformedPredictions.length,
        data: { predictions: transformedPredictions }
      };
    } catch (error) {
      console.error('❌ Contract Predictions Error:', error);
      // Return empty predictions instead of throwing
      return {
        success: true,
        count: 0,
        total: 0,
        data: { predictions: [] }
      };
    }
  },

  // Get single prediction from contract
  async getPrediction(id) {
    try {
      console.log('🎯 Smart Contract: Getting prediction:', id);

      // Try to use read-only contract service
      if (!contractService.isInitialized && !contractService.isReadOnlyInitialized) {
        console.log('📡 Initializing read-only contract service...');
        await contractService.initializeReadOnly();
      }

      if (!contractService.isInitialized && !contractService.isReadOnlyInitialized) {
        console.error('Failed to initialize contract service');
        return {
          success: false,
          data: null
        };
      }

      let prediction = null;

      try {
        prediction = await contractService.getPrediction(id);
      } catch (contractError) {
        console.warn('Contract getPrediction failed, using fallback data:', contractError.message);
        prediction = null; // Set to null to trigger fallback
      }

      // If no prediction returned or null, use fallback
      if (!prediction) {
        console.warn('Contract returned no prediction, using fallback data');

        // Fallback: Return prediction data based on ID
        const fallbackPredictions = {
          '1': {
            id: '1',
            title: '2026 Midterm Elections Winner - Private Voting',
            description: 'Anonymous prediction market for the 2026 US Midterm Elections using FHEVM technology. Your vote and bet amount remain private until resolution.',
            imageUrl: '',
            topicId: '1',
            endTime: new Date('2026-11-08T00:00:00Z'),
            isActive: true,
            isResolved: false,
            createdAt: new Date('2024-12-01T00:00:00Z'),
            updatedAt: new Date('2024-12-01T00:00:00Z'),
            mustShowLive: false,
            liveStartTime: null,
            liveEndTime: null,
            predictionType: 2,
            minPositionAmount: 1,
            maxPositionAmount: 10000,
            createdBy: 'benim_adresim',
            totalParticipants: 0,
            volume: 8750
          },
          '2': {
            id: '2',
            title: 'Will Bitcoin reach $150,000 by end of 2025?',
            description: 'Private prediction market for Bitcoin reaching the $150k milestone by December 31, 2025. Uses FHEVM for encrypted bet amounts and private voting.',
            imageUrl: '',
            topicId: '2',
            endTime: new Date('2025-12-31T23:59:59Z'),
            isActive: true,
            isResolved: false,
            createdAt: new Date('2024-12-01T00:00:00Z'),
            updatedAt: new Date('2024-12-01T00:00:00Z'),
            mustShowLive: false,
            liveStartTime: null,
            liveEndTime: null,
            predictionType: 2,
            minPositionAmount: 1,
            maxPositionAmount: 10000,
            createdBy: 'benim_adresim',
            totalParticipants: 0,
            volume: 8750
          }
        };

        prediction = fallbackPredictions[id.toString()];
      }

      if (!prediction) {
        return {
          success: false,
          data: null
        };
      }

      // Transform to expected format
      const transformedPrediction = {
        _id: prediction.id.toString(),
        title: prediction.title,
        description: prediction.description || '',
        imageUrl: prediction.imageUrl || '',
        topicId: prediction.topicId.toString(),
        isActive: prediction.isActive,
        isResolved: prediction.isResolved,
        endTime: prediction.endTime.toISOString(),
        resolvedAt: prediction.isResolved ? prediction.endTime.toISOString() : null,
        predictionType: prediction.predictionType || 2,
        useFHEVM: true,
        fhevmContractAddress: contractService.getContractAddress('PREDICTION_HUB'),
        minPositionAmount: prediction.minPositionAmount || 1,
        maxPositionAmount: prediction.maxPositionAmount || 10000,
        createdBy: prediction.createdBy || '0x0000000000000000000000000000000000000000',
        mustShowLive: prediction.mustShowLive || false,
        liveStartTime: prediction.liveStartTime ? prediction.liveStartTime.toISOString() : null,
        liveEndTime: prediction.liveEndTime ? prediction.liveEndTime.toISOString() : null,
        options: prediction.options || [
          {
            title: "Yes",
            encryptedTotalShares: "fhevm_encrypted_value",
            publicTotalShares: 0,
            currentOdds: 1,
            isWinner: false,
            yesPrice: 50,
            percentage: 50
          },
          {
            title: "No",
            encryptedTotalShares: "fhevm_encrypted_value",
            publicTotalShares: 0,
            currentOdds: 1,
            isWinner: false,
            yesPrice: 50,
            percentage: 50
          }
        ],
        totalParticipants: prediction.totalParticipants || 0,
        encryptedTotalVolume: "fhevm_encrypted_volume",
        publicTotalVolume: 0,
        volume: 12500, // Mock volume for display
        createdAt: prediction.createdAt ? prediction.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: prediction.updatedAt ? prediction.updatedAt.toISOString() : new Date().toISOString()
      };

      return {
        success: true,
        data: transformedPrediction
      };
    } catch (error) {
      console.error('❌ Contract Get Prediction Error:', error);
      return {
        success: false,
        data: null
      };
    }
  },

  // Get users (mock data since not stored on contract)
  async getUsers() {
    console.log('👥 Smart Contract: Getting users (mock data)...');
    return {
      success: true,
      data: [
        {
          _id: 'user_admin',
          address: 'benim_adresim',
          role: 'super_admin',
          status: 'active',
          totalBets: 0,
          totalVolume: 0,
          winRate: 0,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isVerified: true,
          fhevmEnabled: true,
          encryptedBalance: "fhevm_encrypted_balance"
        }
      ]
    };
  },

  // Get analytics from contract data
  async getAnalytics(timeRange = '7d') {
    try {
      console.log('📊 Smart Contract: Getting analytics...', timeRange);

      let totalBets = 0;

      if (contractService && contractService.isInitialized) {
        try {
          const bets = await contractService.getActiveBets();
          totalBets = bets.length;
        } catch (error) {
          console.warn('Could not get active bets for analytics:', error.message);
        }
      }

      return {
        success: true,
        data: {
          totalBets,
          totalUsers: 1, // Mock data
          totalVolume: 0, // Encrypted on contract
          fhevmBets: totalBets, // All bets use FHEVM
          fhevmUsers: 1, // Mock data
          averageBetAmount: 0, // Encrypted
          growthRate: 0,
          dailyStats: [] // Would need event logging for this
        }
      };
    } catch (error) {
      console.error('❌ Contract Analytics Error:', error);
      return {
        success: true,
        data: {
          totalBets: 0,
          totalUsers: 0,
          totalVolume: 0,
          fhevmBets: 0,
          fhevmUsers: 0,
          averageBetAmount: 0,
          growthRate: 0,
          dailyStats: []
        }
      };
    }
  }
};

// FHEVM status check
export const checkFHEVMStatus = () => {
  return {
    enabled: true,
    predictionsWithFHEVM: Object.values(TOPIC_MAPPING).filter(topic => topic.fhevmEnabled).length,
    topicsWithFHEVM: Object.values(TOPIC_MAPPING).filter(topic => topic.fhevmEnabled).length,
    usersWithFHEVM: 1 // Mock data since not stored on contract
  };
};

export default directDatabaseService;

