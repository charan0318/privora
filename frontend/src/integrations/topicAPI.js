import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const topicAPI = {
  // Get all topics
  getTopics: async () => {
    const response = await axios.get(`${API_URL}/topics`);
    return response.data;
  },

  // Create topic
  createTopic: async (topicData) => {
    const response = await axios.post(`${API_URL}/topics`, topicData);
    return response.data;
  },

  // Update topic
  updateTopic: async (id, topicData) => {
    const response = await axios.put(`${API_URL}/topics/${id}`, topicData);
    return response.data;
  },

  // Delete topic
  deleteTopic: async (id) => {
    const response = await axios.delete(`${API_URL}/topics/${id}`);
    return response.data;
  },

  // Assign topic to prediction
  assignPredictionTopic: async (contractId, topicId) => {
    const response = await axios.post(`${API_URL}/topics/assign`, {
      contractId,
      topicId
    });
    return response.data;
  },

  // Get prediction topic
  getPredictionTopic: async (contractId) => {
    const response = await axios.get(`${API_URL}/topics/prediction/${contractId}`);
    return response.data;
  },

  // Get predictions by topic
  getPredictionsByTopic: async (topicId) => {
    const response = await axios.get(`${API_URL}/topics/${topicId}/predictions`);
    return response.data;
  }
};

export default topicAPI;

