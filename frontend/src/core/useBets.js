import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useFHEVM } from './useFHEVM';
import api from '../integrations/api';
import { ethers } from 'ethers';

export const usePredictions = () => {
  const { isConnected, getContract, account } = useWallet();
  const { encryptAmount, decryptAmount, getPredictions: fhevmGetPredictions, getPrediction: fhevmGetPrediction } = useFHEVM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Contract addresses (Updated to new deployed contracts)
  const PREDICTION_HUB_ADDRESS = import.meta.env.VITE_PREDICTION_HUB_CONTRACT || "0x6B0Fc68e8e28d4E35bD33E8eAa32b06fC8E1356E";
  const PREDICTION_HUB_ABI = [
    // Add ABI here - simplified for demo
    "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, string title, string imageUrl, uint256 topicId, tuple(string title, uint64 totalAmount, uint256 totalShares, bool isWinner)[] options, uint256 endTime, bool isActive, bool isResolved, uint256 createdAt, uint256 updatedAt, bool mustShowLive, uint256 liveStartTime, uint256 liveEndTime, uint8 predictionType))",
    "function submitPosition(uint256 _predictionId, uint256 _optionIndex, bytes32 _encryptedAmount, bytes _proof, uint256 _actualAmount) external",
    "function getActivePredictions() external view returns (uint256[] memory)",
    "function getPredictionsByTopic(uint256 _topicId) external view returns (uint256[] memory)",
    "function getUserPositions(address _user) external view returns (tuple(uint256 predictionId, uint256 optionIndex, uint64 amount, uint256 shares, uint256 timestamp, bool claimed)[] memory)",
    "function claimWinnings(uint256 _predictionId) external"
  ];

  const getPredictions = async (params = {}) => {
    try {
      setLoading(true);

      // Use database-first approach (backend API)
      try {

        const response = await api.get('/predictions', { params });

        if (response.data.success && response.data.data?.predictions) {
          console.log('✅ API Result:', response.data.data.predictions.length, 'predictions loaded');
          return {
            predictions: response.data.data.predictions,
            total: response.data.count || response.data.data.predictions.length,
            totalPages: response.data.totalPages || 1,
            currentPage: response.data.currentPage || 1
          };
        }

        throw new Error('Invalid API response format');

      } catch (apiError) {
        console.warn('🔄 Backend API failed, falling back to contract data...', apiError.message);

        try {
          // Fallback to contract data using directDatabaseService
          const { directDatabaseService } = await import('../integrations/directDatabaseService');
          const contractResult = await directDatabaseService.getPredictions(params);

          if (contractResult.success && contractResult.data.predictions) {
            return {
              predictions: contractResult.data.predictions,
              total: contractResult.count || contractResult.data.predictions.length
            };
          }

          throw new Error('Contract data fetch failed');

        } catch (contractError) {
          console.error('Contract data fetch failed:', contractError);
        }
      }

      // Final fallback to empty data
      return { predictions: [], total: 0 };

    } catch (err) {
      setError(err.message);
      return { predictions: [], total: 0 };
    } finally {
      setLoading(false);
    }
  };

  const getPrediction = async (predictionId) => {
    try {
      setLoading(true);

      // Use database-first approach (backend API)
      try {

        const response = await api.get(`/predictions/${predictionId}`);

        if (response.data.success && response.data.data?.prediction) {
          return response.data.data.prediction;
        }

        throw new Error('Invalid API response format');

      } catch (apiError) {
        console.warn('🔄 Backend API failed, falling back to contract data...', apiError.message);

        try {
          // Fallback to contract data using directDatabaseService
          const { directDatabaseService } = await import('../integrations/directDatabaseService');
          const contractResult = await directDatabaseService.getPrediction(predictionId);

          if (contractResult.success && contractResult.data) {
            return contractResult.data;
          }

          throw new Error('Contract data fetch failed');

        } catch (contractError) {
          console.error('Contract prediction fetch failed:', contractError);
        }
      }

      throw new Error('Prediction not found');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchPredictions = async (query) => {
    try {
      setLoading(true);
      const response = await api.get('/predictions/search', {
        params: { q: query },
        optional: true
      });
      return response.data.predictions || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const submitPosition = async (predictionId, optionIndex, amount) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      // Get contract instance
      const contract = getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI);
      
      // Encrypt the amount
      const encryptedAmount = await encryptAmount(amount);
      
      // Prepare transaction
      const tx = await contract.submitPosition(
        predictionId,
        optionIndex,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof,
        amount
      );
      
      await tx.wait();
      
      // Update backend
      await api.post(`/predictions/${predictionId}/submit`, {
        optionIndex,
        amount,
        txHash: tx.hash
      }, { optional: true });
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserPositions = async () => {
    if (!isConnected || !account) {
      return [];
    }

    try {
      setLoading(true);
      const response = await api.get(`/predictions/user/${account}`, { optional: true });
      return response.data.predictions || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const claimWinnings = async (predictionId) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      
      const contract = getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI);
      const tx = await contract.claimWinnings(predictionId);
      await tx.wait();
      
      // Update backend
      await api.post(`/predictions/${predictionId}/claim`, {
        txHash: tx.hash
      }, { optional: true });
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBookmarkedPredictions = () => {
    const saved = localStorage.getItem('bookmarkedPredictions');
    return saved ? JSON.parse(saved) : [];
  };

  const bookmarkPrediction = (predictionId) => {
    const bookmarked = getBookmarkedPredictions();
    const isBookmarked = bookmarked.includes(predictionId);
    
    let newBookmarked;
    if (isBookmarked) {
      newBookmarked = bookmarked.filter(id => id !== predictionId);
    } else {
      newBookmarked = [...bookmarked, predictionId];
    }
    
    localStorage.setItem('bookmarkedPredictions', JSON.stringify(newBookmarked));
    return !isBookmarked;
  };

  // Get on-chain prediction data
  const getPredictionFromContract = async (predictionId) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI);
      const predictionData = await contract.getPrediction(predictionId);
      return predictionData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Get active predictions from contract
  const getActivePredictionsFromContract = async () => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI);
      const predictionIds = await contract.getActivePredictions();
      return predictionIds.map(id => id.toString());
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Calculate potential winnings
  const calculatePotentialWinnings = (predictionAmount, optionPrice, totalPool) => {
    if (!predictionAmount || !optionPrice || !totalPool) return 0;
    
    const shares = predictionAmount / (optionPrice / 100);
    const potentialReturn = shares * (totalPool / shares);
    return potentialReturn - predictionAmount; // Profit
  };

  // Format prediction data for display
  const formatPredictionData = (prediction) => {
    return {
      ...prediction,
      formattedEndTime: new Date(prediction.endTime * 1000),
      formattedCreatedAt: new Date(prediction.createdAt * 1000),
      isEnded: Date.now() > prediction.endTime * 1000,
      timeUntilEnd: prediction.endTime * 1000 - Date.now(),
      options: prediction.options?.map(option => ({
        ...option,
        percentage: Math.round((option.totalShares / prediction.totalShares) * 100) || 0,
        yesPrice: Math.round(option.totalShares > 0 ? (option.totalAmount / option.totalShares) * 100 : 50),
        noPrice: Math.round(option.totalShares > 0 ? 100 - (option.totalAmount / option.totalShares) * 100 : 50)
      }))
    };
  };

  return {
    loading,
    error,
    getPredictions,
    getPrediction,
    searchPredictions,
    submitPosition,
    getUserPositions,
    claimWinnings,
    getBookmarkedPredictions,
    bookmarkPrediction,
    getPredictionFromContract,
    getActivePredictionsFromContract,
    calculatePotentialWinnings,
    formatPredictionData,
    clearError: () => setError(null)
  };
};

