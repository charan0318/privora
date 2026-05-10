import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Export base URL for image paths
export const BASE_URL = API_URL.replace('/api', '');

export const predictionSyncAPI = {
  // Sync predictions from contract to database
  syncPredictions: async (contractData) => {
    const response = await axios.post(`${API_URL}/prediction-sync/sync`, contractData);
    return response.data;
  },

  // Get all predictions from database
  getAllPredictions: async (params = {}) => {
    const response = await axios.get(`${API_URL}/prediction-sync`, { params });
    return response.data;
  },

  // Get prediction by contractId
  getPredictionByContractId: async (contractId) => {
    const response = await axios.get(`${API_URL}/prediction-sync/${contractId}`);
    return response.data;
  },

  // Update prediction topic
  updatePredictionTopic: async (contractId, topicId) => {
    const response = await axios.put(`${API_URL}/prediction-sync/${contractId}/topic`, { topicId });
    return response.data;
  },

  // Get predictions by topic
  getPredictionsByTopic: async (topicId) => {
    const response = await axios.get(`${API_URL}/prediction-sync/topic/${topicId}`);
    return response.data;
  },

  // Update prediction image (URL)
  updatePredictionImage: async (contractId, imageUrl) => {
    const response = await axios.put(`${API_URL}/prediction-sync/${contractId}/image`, { imageUrl });
    return response.data;
  },

  // Upload prediction image (File)
  uploadPredictionImage: async (contractId, file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${API_URL}/prediction-sync/${contractId}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Finalize prediction outcome
  finalizeOutcome: async (contractId, data) => {
    const response = await axios.post(`${API_URL}/prediction-sync/${contractId}/finalize`, data);
    return response.data;
  },

  // Finalize nested prediction outcome
  finalizeNestedOutcome: async (contractId, data) => {
    const response = await axios.post(`${API_URL}/prediction-sync/${contractId}/finalize-nested`, data);
    return response.data;
  }
};

export default predictionSyncAPI;

