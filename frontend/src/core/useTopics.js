import { useState, useEffect } from 'react';
import topicAPI from '../integrations/topicAPI';

export const useTopics = () => {
  const [topics, setTopics] = useState([]);
  const [topLevelTopics, setTopLevelTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load topics on mount
  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from new topicAPI
      const response = await topicAPI.getTopics();
      const fetchedTopics = response.data || [];

      // Transform to match expected format with 'id' field
      const transformed = fetchedTopics.map(topic => ({
        id: topic._id,
        _id: topic._id,
        name: topic.name,
        icon: topic.icon,
        color: topic.color,
        displayOrder: topic.displayOrder,
        isActive: topic.isActive
      }));

      // Sort by displayOrder
      transformed.sort((a, b) => a.displayOrder - b.displayOrder);

      setTopics(transformed);
      setTopLevelTopics(transformed); // All are top-level in simple system

    } catch (err) {
      console.error('Error loading topics:', err);
      setTopics([]);
      setTopLevelTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const getTopic = async (topicId) => {
    try {
      const response = await api.get(`/topics/${topicId}`, { optional: true });
      return response.data?.topic;
    } catch (err) {
      console.error('Error getting topic:', err);
      throw err;
    }
  };

  const getSubTopics = (parentId) => {
    return topics.filter(topic => topic.parentId === parentId);
  };

  const getTopicPath = (topicId) => {
    const path = [];
    let currentTopic = topics.find(topic => topic.id === topicId);
    
    while (currentTopic) {
      path.unshift(currentTopic);
      if (currentTopic.parentId && currentTopic.parentId !== 0) {
        currentTopic = topics.find(topic => topic.id === currentTopic.parentId);
      } else {
        break;
      }
    }
    
    return path;
  };

  const getTopicWithChildren = (topicId) => {
    const topic = topics.find(topic => topic.id === topicId);
    if (!topic) return null;

    const children = getSubTopics(topicId);
    
    return {
      ...topic,
      children: children.map(child => getTopicWithChildren(child.id))
    };
  };

  // Get all descendant topics (recursive)
  const getAllDescendants = (topicId) => {
    const descendants = [];
    const directChildren = getSubTopics(topicId);
    
    for (const child of directChildren) {
      descendants.push(child);
      descendants.push(...getAllDescendants(child.id));
    }
    
    return descendants;
  };

  const searchTopics = (query) => {
    if (!query.trim()) return [];
    
    const lowercaseQuery = query.toLowerCase();
    return topics.filter(topic => 
      topic.name.toLowerCase().includes(lowercaseQuery) ||
      topic.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  return {
    topics,
    topLevelTopics,
    loading,
    error,
    loadTopics,
    getTopic,
    getSubTopics,
    getTopicPath,
    getTopicWithChildren,
    getAllDescendants,
    searchTopics,
    clearError: () => setError(null)
  };
};

