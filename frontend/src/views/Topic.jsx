import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PredictionCard from '../modules/home/PredictionCard';
import LoadingSpinner from '../modules/common/LoadingSpinner';
import { predictionAPI, topicAPI } from '../integrations/api';

const Topic = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, ended
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular, ending_soon
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!topicId) {
      navigate('/');
      return;
    }
    loadTopicData();
  }, [topicId]);

  useEffect(() => {
    filterAndSortPredictions();
  }, [filter, sortBy, searchTerm]);

  const loadTopicData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [topicData, predictionsData] = await Promise.all([
        topicAPI.getTopicById(topicId),
        predictionAPI.getPredictionsByTopic(topicId)
      ]);
      
      setTopic(topicData);
      setPredictions(predictionsData);
    } catch (error) {
      console.error('Error loading topic data:', error);
      setError('Failed to load topic data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPredictions = () => {
    let filteredPredictions = [...predictions];

    // Apply search filter
    if (searchTerm) {
      filteredPredictions = filteredPredictions.filter(prediction =>
        prediction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case 'active':
        filteredPredictions = filteredPredictions.filter(prediction => 
          prediction.isActive && new Date() < new Date(prediction.endTime)
        );
        break;
      case 'ended':
        filteredPredictions = filteredPredictions.filter(prediction => 
          !prediction.isActive || new Date() >= new Date(prediction.endTime)
        );
        break;
      default:
        // all - no additional filtering
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filteredPredictions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'popular':
        filteredPredictions.sort((a, b) => (b.totalPredictions || 0) - (a.totalPredictions || 0));
        break;
      case 'ending_soon':
        filteredPredictions = filteredPredictions
          .filter(prediction => prediction.isActive && new Date() < new Date(prediction.endTime))
          .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
        break;
      case 'newest':
      default:
        filteredPredictions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filteredPredictions;
  };

  const filteredPredictions = filterAndSortPredictions();

  const getFilterCount = (filterType) => {
    switch (filterType) {
      case 'active':
        return predictions.filter(prediction => prediction.isActive && new Date() < new Date(prediction.endTime)).length;
      case 'ended':
        return predictions.filter(prediction => !prediction.isActive || new Date() >= new Date(prediction.endTime)).length;
      default:
        return predictions.length;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-[#A1A1AA] font-mono mb-4">{error || 'Topic not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="glass-panel p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-[#A1A1AA] font-mono hover:text-[#ECEDEE] font-mono tracking-widest uppercase"
              >
                ← Back to Markets
              </button>
              <div>
                <h1 className="text-3xl font-bold text-[#ECEDEE] font-mono tracking-widest uppercase">{topic.name}</h1>
                {topic.description && (
                  <p className="text-[#A1A1AA] font-mono mt-2">{topic.description}</p>
                )}
              </div>
            </div>
            
            {topic.icon && (
              <div className="text-4xl">{topic.icon}</div>
            )}
          </div>
          
          <div className="mt-4 flex items-center space-x-6 text-sm text-[#A1A1AA] font-mono">
            <span>{predictions.length} total markets</span>
            <span>{getFilterCount('active')} active</span>
            <span>{getFilterCount('ended')} ended</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="glass-panel p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-[#1C1D20] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-4">
              {/* Filter Tabs */}
              <div className="flex space-x-1 bg-[#1A2F45] rounded-lg p-1">
                {[
                  { id: 'all', label: 'All', count: getFilterCount('all') },
                  { id: 'active', label: 'Active', count: getFilterCount('active') },
                  { id: 'ended', label: 'Ended', count: getFilterCount('ended') }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter === tab.id
                        ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]'
                        : 'text-[#A1A1AA] font-mono hover:text-[#ECEDEE] font-mono tracking-widest uppercase'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-[#1C1D20] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="popular">Most Popular</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Predictions Grid */}
        {filteredPredictions.length === 0 ? (
          <div className="glass-panel p-12 text-center border-dashed">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">No markets found</h3>
            <p className="text-[#A1A1AA] font-mono">
              {searchTerm 
                ? `No markets match "${searchTerm}" in this topic.`
                : `No ${filter === 'all' ? '' : filter + ' '}markets in this topic yet.`
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPredictions.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onClick={() => navigate(`/prediction/${prediction.id}`)}
              />
            ))}
          </div>
        )}

        {/* Load More (if needed) */}
        {filteredPredictions.length > 0 && filteredPredictions.length >= 20 && (
          <div className="text-center mt-8">
            <button className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors">
              Load More Markets
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topic;


