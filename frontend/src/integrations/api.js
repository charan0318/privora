import axios from 'axios';
import { showError, showNetworkError } from '../utils/toastUtils';
import { directDatabaseService } from './directDatabaseService';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    // Handle different error status codes
    if (response) {
      const { status, data } = response;
      let errorMessage = data?.message || 'An error occurred';

      switch (status) {
        case 400:
          errorMessage = data?.message || 'Bad request';
          break;
        case 401:
          errorMessage = 'Unauthorized - Please connect your wallet';
          // Clear auth token if exists
          localStorage.removeItem('authToken');
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 429:
          errorMessage = 'Too many requests - Please wait a moment';
          break;
        case 500:
          errorMessage = 'Server error - Please try again later';
          break;
        default:
          errorMessage = `Error ${status}: ${errorMessage}`;
      }

      // Show toast notification for errors (except for optional resources)
      if (!error.config?.optional) {
        showError(errorMessage);
      }

      error.message = errorMessage;
    } else if (error.request) {
      // Network error
      const networkError = 'Network error - Please check your connection';
      if (!error.config?.optional) {
        showNetworkError(networkError);
      }
      error.message = networkError;
    } else {
      // Other error
      showError(error.message || 'An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// Helper function to try API first, fallback to direct database
const tryApiWithFallback = async (apiCall, fallbackCall, fallbackName) => {
  try {
    console.log(`🌐 Trying API call...`);
    const response = await apiCall();
    console.log(`✅ API call successful`);
    return response;
  } catch (error) {
    console.log(`❌ API call failed, using ${fallbackName} fallback:`, error.message);
    const fallbackResult = await fallbackCall();
    console.log(`✅ ${fallbackName} fallback successful`);
    // Transform direct service result to match API response format
    return { data: fallbackResult };
  }
};

// API methods
export const apiMethods = {
  // Auth endpoints
  auth: {
    login: (walletAddress, signature) =>
      api.post('/auth/login', { walletAddress, signature }),

    logout: () =>
      api.post('/auth/logout'),

    verify: () =>
      api.get('/auth/verify'),
  },

  // Position endpoints with FHEVM fallback
  positions: {
    getAll: (params) =>
      tryApiWithFallback(
        () => api.get('/positions', { params }),
        () => directDatabaseService.getPositions(params),
        'FHEVM Database'
      ),

    getById: (id) =>
      tryApiWithFallback(
        () => api.get(`/positions/${id}`),
        () => directDatabaseService.getPosition(id),
        'FHEVM Database'
      ),

    search: (query) =>
      api.get('/positions/search', { params: { q: query } }),

    place: (predictionId, data) =>
      api.post(`/positions/${predictionId}/place`, data),

    claim: (predictionId, data) =>
      api.post(`/positions/${predictionId}/claim`, data),

    getUserPositions: (address) =>
      api.get(`/positions/user/${address}`),

    getByTopic: (topicId) =>
      tryApiWithFallback(
        () => api.get(`/positions/topic/${topicId}`),
        () => directDatabaseService.getPositions({ topicId }),
        'FHEVM Database'
      ),
  },

  // Topic endpoints with FHEVM fallback
  topics: {
    getAll: () =>
      tryApiWithFallback(
        () => api.get('/topics'),
        () => directDatabaseService.getTopics(),
        'FHEVM Database'
      ),

    getById: (id) =>
      api.get(`/topics/${id}`),

    getTopLevel: () =>
      tryApiWithFallback(
        () => api.get('/topics/top-level'),
        () => directDatabaseService.getTopics(),
        'FHEVM Database'
      ),

    getSubTopics: (parentId) =>
      api.get(`/topics/${parentId}/children`),
  },

  // Admin endpoints with FHEVM fallback
  admin: {
    // Prediction management
    getPredictions: (params) =>
      tryApiWithFallback(
        () => api.get('/admin/predictions', { params }),
        () => directDatabaseService.getPredictions(params),
        'FHEVM Database'
      ),

    createPrediction: (data) =>
      api.post('/admin/predictions', data),

    updatePrediction: (id, data) =>
      api.put(`/admin/predictions/${id}`, data),

    resolvePrediction: (id, data) =>
      api.post(`/admin/predictions/${id}/resolve`, data),

    // Topic management
    createTopic: (data) =>
      api.post('/admin/topics', data),

    updateTopic: (id, data) =>
      api.put(`/admin/topics/${id}`, data),

    deleteTopic: (id) =>
      api.delete(`/admin/topics/${id}`),

    // User management
    getUsers: () =>
      tryApiWithFallback(
        () => api.get('/admin/users'),
        () => directDatabaseService.getUsers(),
        'FHEVM Database'
      ),

    updateUser: (id, data) =>
      api.put(`/admin/users/${id}`, data),

    // Analytics
    getAnalytics: (params) =>
      tryApiWithFallback(
        () => api.get('/admin/analytics', { params }),
        () => directDatabaseService.getAnalytics(params?.timeRange),
        'FHEVM Database'
      ),

    getStats: () =>
      tryApiWithFallback(
        () => api.get('/admin/stats'),
        () => directDatabaseService.getAnalytics(),
        'FHEVM Database'
      ),
  },

  // Upload endpoints
  upload: {
    image: (file) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
  },
};

// Helper functions
export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  console.error('API Error:', error);
  const message = error.response?.data?.message || error.message || fallbackMessage;
  return message;
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isServerError = (error) => {
  return error.response && error.response.status >= 500;
};

export const isClientError = (error) => {
  return error.response && error.response.status >= 400 && error.response.status < 500;
};

// Export API methods for backward compatibility
export const betAPI = apiMethods.bets;
export const categoryAPI = apiMethods.categories;
export const topicAPI = apiMethods.topics;
export const predictionAPI = apiMethods.admin; // Predictions are part of admin API
export const authAPI = apiMethods.auth;
export const adminAPI = apiMethods.admin;
export const userAPI = apiMethods.positions; // User positions are part of positions API
export const uploadAPI = apiMethods.upload;

// Export default api instance
export default api;

