import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useWallet } from '../../core/useWallet';
import topicAPI from '../../integrations/topicAPI';
import predictionSyncAPI, { BASE_URL } from '../../integrations/predictionSyncAPI';
import { getNetworkConfig } from '../../config/contracts';
import PredictionHubABI from '@artifacts/PredictionHub.sol/PredictionHub.json';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const PredictionTopicAssignment = ({ onUpdate }) => {
  const { chainId, account } = useWallet();
  const [topics, setTopics] = useState([]);
  const [dbPredictions, setDbPredictions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loadingDbPredictions, setLoadingDbPredictions] = useState(true);

  // Filtering and sorting states
  const [sortBy, setSortBy] = useState('contractId');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchTopics();
    fetchDbPredictions();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await topicAPI.getTopics();
      // Handle all possible response formats
      let topicsData = [];
      if (Array.isArray(response)) {
        topicsData = response;
      } else if (response && Array.isArray(response.topics)) {
        topicsData = response.topics;
      } else if (response && Array.isArray(response.data)) {
        topicsData = response.data;
      } else if (response && typeof response === 'object') {
        // Try to extract any array property
        const keys = Object.keys(response);
        for (const key of keys) {
          if (Array.isArray(response[key])) {
            topicsData = response[key];
            break;
          }
        }
      }
      setTopics(topicsData);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopics([]);
    }
  };

  const fetchDbPredictions = async () => {
    try {
      setLoadingDbPredictions(true);
      const response = await predictionSyncAPI.getAllPredictions();
      setDbPredictions(response.data || []);
    } catch (error) {
      console.error('Error fetching DB predictions:', error);
      setDbPredictions([]);
    } finally {
      setLoadingDbPredictions(false);
    }
  };

  const handleSyncPredictions = async () => {
    try {
      setSyncing(true);
      setSyncStatus(null);

      const networkConfig = getNetworkConfig(chainId);

      const syncData = {
        contractAddress: networkConfig.contracts.PREDICTION_HUB,
        rpcUrl: networkConfig.rpcUrl,
        contractABI: PredictionHubABI.abi,
        chainId
      };

      const result = await predictionSyncAPI.syncPredictions(syncData);

      setSyncStatus({
        success: true,
        message: result.message,
        synced: result.synced,
        updated: result.updated,
        failed: result.failed
      });

      await fetchDbPredictions();

    } catch (error) {
      setSyncStatus({
        success: false,
        message: error.response?.data?.message || 'Sync failed'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleAssignTopic = async (contractId, topicId) => {
    // Update local state immediately (optimistic update)
    setDbPredictions(dbPredictions.map(pred =>
      pred.contractId === contractId
        ? { ...pred, topicId }
        : pred
    ));

    // Show success toast immediately
    const topicName = topics.find(t => t._id === topicId)?.name || 'None';
    toast.success(`Topic updated to "${topicName}"`, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '500',
      },
    });

    // Save to DB in background (silent)
    try {
      await predictionSyncAPI.updatePredictionTopic(contractId, topicId);
    } catch (error) {
      // Revert on error
      setDbPredictions(dbPredictions.map(pred =>
        pred.contractId === contractId
          ? { ...pred, topicId: pred.topicId }
          : pred
      ));

      toast.error(error.response?.data?.message || 'Failed to update topic', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  // Get filtered and sorted predictions
  const getFilteredAndSortedPredictions = () => {
    let filtered = [...dbPredictions];

    // Filter by topic
    if (filterTopic) {
      filtered = filtered.filter(pred => pred.topicId === filterTopic);
    }

    // Filter by status
    if (filterStatus === 'resolved') {
      filtered = filtered.filter(pred => pred.isResolved === true);
    } else if (filterStatus === 'active') {
      filtered = filtered.filter(pred => pred.isActive === true && pred.isResolved === false);
    } else if (filterStatus === 'ended') {
      filtered = filtered.filter(pred => pred.isActive === false && pred.isResolved === false);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'contractId':
          compareValue = a.contractId - b.contractId;
          break;
        case 'title':
          compareValue = (a.title || '').localeCompare(b.title || '');
          break;
        case 'endTime':
          compareValue = new Date(a.endTime) - new Date(b.endTime);
          break;
        case 'topic':
          const topicA = topics.find(t => t._id === a.topicId)?.name || '';
          const topicB = topics.find(t => t._id === b.topicId)?.name || '';
          compareValue = topicA.localeCompare(topicB);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-[#0A1424] border border-[#1A2F45] rounded-none p-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="h-5 bg-[#233F59] rounded-none w-2/3 mb-2"></div>
              <div className="h-3 bg-[#233F59] rounded-none w-full mb-3"></div>
              <div className="flex items-center gap-4">
                <div className="h-3 bg-[#233F59] rounded-none w-20"></div>
                <div className="h-3 bg-[#233F59] rounded-none w-24"></div>
                <div className="h-3 bg-[#233F59] rounded-none w-16"></div>
              </div>
            </div>
            <div className="h-10 bg-[#233F59] rounded-none w-[180px] flex-shrink-0"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const filteredPredictions = getFilteredAndSortedPredictions();

  return (
    <div className="space-y-4">
      {/* Compact Filter & Sync Bar */}
      <div className="bg-[#0A1424] border border-[#1A2F45] rounded-none shadow-none">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          {/* Left: Filters */}
          <div className="flex items-center gap-4 flex-1">
            {/* Filter Label & Topic Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Filter:</span>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent bg-[#0A1424] text-white font-medium cursor-pointer hover:border-gray-400 transition-colors min-w-[140px]"
              >
                <option value="" className="text-white">All Topics</option>
                {Array.isArray(topics) && topics.map((topic) => (
                  <option key={topic._id} value={topic._id} className="text-white">
                    {topic.icon} {topic.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent bg-[#0A1424] text-white font-medium cursor-pointer hover:border-gray-400 transition-colors min-w-[120px]"
              >
                <option value="" className="text-white">All Status</option>
                <option value="active" className="text-white">● Active</option>
                <option value="ended" className="text-white">○ Ended</option>
                <option value="resolved" className="text-white">✓ Resolved</option>
              </select>
            </div>

            {/* Inset Divider */}
            <div className="relative h-8 w-px">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200/50 via-transparent to-gray-200/50"></div>
            </div>

            {/* Sort Label & Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent bg-[#0A1424] text-white font-medium cursor-pointer hover:border-gray-400 transition-colors"
              >
                <option value="contractId" className="text-white">ID</option>
                <option value="title" className="text-white">Name</option>
                <option value="endTime" className="text-white">End Time</option>
                <option value="topic" className="text-white">Topic</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={toggleSortOrder}
              className="p-1.5 hover:bg-[#1A2F45] rounded-none transition-colors text-gray-500 hover:text-gray-300"
              title={sortOrder === 'asc' ? 'Ascending (click to sort descending)' : 'Descending (click to sort ascending)'}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </button>

            {/* Results Count */}
            <div className="flex items-center gap-3 ml-1">
              {/* Inset Divider */}
              <div className="relative h-8 w-px">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200/50 via-transparent to-gray-200/50"></div>
              </div>
              <span className="heading-mono text-sm text-[#5ce1e6] whitespace-nowrap">
                {filteredPredictions.length} prediction{filteredPredictions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Right: Sync Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncPredictions}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#5ce1e6] text-[#020813] hover:bg-[#06b6d4] rounded-none text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Predictions'}
            </button>
          </div>
        </div>

        {/* Sync Status (Compact) */}
        {syncStatus && (
          <div className={`${syncStatus.success ? 'bg-green-50 border-t border-green-200' : 'bg-red-50 border-t border-red-200'} px-4 py-2`}>
            <p className={`text-xs ${syncStatus.success ? 'text-green-800' : 'text-red-800'}`}>
              {syncStatus.message}
              {syncStatus.success && (
                <span className="ml-2 text-gray-400">
                  (✓ {syncStatus.synced} new, ↻ {syncStatus.updated} updated{syncStatus.failed > 0 && `, ✗ ${syncStatus.failed} failed`})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {loadingDbPredictions ? (
        <LoadingSkeleton />
      ) : dbPredictions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No predictions in database. Click "Sync Predictions" to import from contract.
        </div>
      ) : filteredPredictions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No predictions match your filters. Try adjusting the topic filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPredictions.map((prediction) => (
            <div
              key={prediction.contractId}
              className="bg-[#0A1424] border border-[#1A2F45] rounded-none p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white mb-1 truncate">
                    #{prediction.contractId} - {prediction.title}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-1 mb-2">{prediction.description}</p>
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                    <span>Type: {['Binary', 'Multiple', 'Nested'][prediction.betType]}</span>
                    {prediction.options?.length > 0 && <span>Options: {prediction.options.length}</span>}
                    <span className={prediction.isActive ? 'text-[#5ce1e6] font-medium' : 'text-gray-400'}>
                      {prediction.isActive ? '● Active' : '○ Ended'}
                    </span>
                    {prediction.isResolved && (
                      <span className="text-[#5ce1e6] font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={prediction.topicId || ''}
                    onChange={(e) => handleAssignTopic(prediction.contractId, e.target.value)}
                    className="px-3 py-2 border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent min-w-[180px] bg-[#0A1424] text-white"
                  >
                    <option value="">No Topic</option>
                    {topics.map((topic) => (
                      <option key={topic._id} value={topic._id}>
                        {topic.icon} {topic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionTopicAssignment;





