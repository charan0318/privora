import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PredictionCard from './PredictionCard';
import { useContractPredictions } from '../../core/useContractPredictions';
import { useWallet } from '../../core/useWallet';
import { Loader2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import predictionSyncAPI from '../../integrations/predictionSyncAPI';

const ITEMS_PER_PAGE = 16; 

const PredictionGrid = ({ filter = 'all', topicId = null, searchQuery = '' }) => {
  const [bookmarkedPredictions, setBookmarkedPredictions] = useState(new Set());
  const [topicPredictionIds, setTopicPredictionIds] = useState([]);
  const [loadingTopicPredictions, setLoadingTopicPredictions] = useState(false);
  const [dbPredictions, setDbPredictions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const { chainId } = useWallet();

  // Default to Sepolia (11155111) when no wallet connected, since contracts are deployed there
  const effectiveChainId = chainId || 11155111;
  const { predictions: contractPredictions, loading: isLoading, error } = useContractPredictions(effectiveChainId);

  useEffect(() => {
    const fetchDbPredictions = async () => {
      try {
        const response = await predictionSyncAPI.getAllPredictions({ limit: 1000 });
        setDbPredictions(response.data || []);
      } catch (error) {
        console.error('Error fetching DB predictions:', error);
      }
    };
    fetchDbPredictions();
  }, []);

  const mergedPredictions = useMemo(() => {
    // If we have contract predictions, merge with DB data
    if (contractPredictions.length > 0) {
      return contractPredictions.map(contractPrediction => {
        const dbPrediction = dbPredictions.find(db => db.contractId === contractPrediction.contractId);
        return {
          ...contractPrediction,
          imageUrl: dbPrediction?.imageUrl || contractPrediction.imageUrl,
          topicId: dbPrediction?.topicId || contractPrediction.topicId,
          topic: dbPrediction?.topic || contractPrediction.topic,
        };
      });
    }
    
    // Fallback: Use DB predictions when no contract predictions exist
    // This allows the app to work even when blockchain has no signals yet
    return dbPredictions.map(dbPrediction => ({
      id: dbPrediction._id || dbPrediction.id,
      contractId: dbPrediction.contractId,
      title: dbPrediction.title,
      description: dbPrediction.description,
      endTime: dbPrediction.endTime,
      isActive: dbPrediction.isActive,
      isResolved: dbPrediction.isResolved,
      predictionType: dbPrediction.predictionType || dbPrediction.betType || 0,
      options: dbPrediction.options || [],
      volume: dbPrediction.volume || 0,
      imageUrl: dbPrediction.imageUrl,
      topicId: dbPrediction.topicId,
      topic: dbPrediction.topic,
      liquidityParam: dbPrediction.liquidityParam || 100,
    }));
  }, [contractPredictions, dbPredictions]);

  useEffect(() => {
    const saved = localStorage.getItem('bookmarkedPredictions');
    if (saved) {
      setBookmarkedPredictions(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    const fetchTopicPredictions = async () => {
      if (!topicId) {
        setTopicPredictionIds([]);
        return;
      }

      try {
        setLoadingTopicPredictions(true);
        const response = await predictionSyncAPI.getPredictionsByTopic(topicId);
        const predictions = response.data || [];
        const predictionIds = predictions.map(prediction => prediction.contractId);
        setTopicPredictionIds(predictionIds);
      } catch (error) {
        console.error('Error fetching topic predictions:', error);
        setTopicPredictionIds([]);
      } finally {
        setLoadingTopicPredictions(false);
      }
    };

    fetchTopicPredictions();
  }, [topicId]);

  const filteredPredictions = useMemo(() => {
    let filtered = [...mergedPredictions];

    if (topicId && topicPredictionIds.length > 0) {
      filtered = filtered.filter(prediction => topicPredictionIds.includes(prediction.contractId));
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prediction =>
        prediction.title?.toLowerCase().includes(query) ||
        prediction.description?.toLowerCase().includes(query)
      );
    }

    if (filter === 'bookmarked') {
      filtered = filtered.filter(prediction => bookmarkedPredictions.has(prediction.id));
    } else if (filter === 'ending-soon') {
      const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
      filtered = filtered.filter(prediction => prediction.endTime && prediction.endTime <= oneDayFromNow);
    } else if (filter === 'new') {
      filtered.sort((a, b) => b.contractId - a.contractId);
    } else if (filter === 'trending') {
      filtered.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => b.contractId - a.contractId);
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => a.contractId - b.contractId);
    } else if (sortBy === 'volume-high') {
      filtered.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (sortBy === 'volume-low') {
      filtered.sort((a, b) => (a.volume || 0) - (b.volume || 0));
    } else if (sortBy === 'ending-soon') {
      filtered.sort((a, b) => (a.endTime || Infinity) - (b.endTime || Infinity));
    } else if (sortBy === 'ending-later') {
      filtered.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
    }

    return filtered;
  }, [mergedPredictions, filter, searchQuery, bookmarkedPredictions, topicId, topicPredictionIds, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, topicId, sortBy]);

  const totalPages = Math.ceil(filteredPredictions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPredictions = filteredPredictions.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookmark = useCallback((predictionId) => {
    setBookmarkedPredictions(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(predictionId)) {
        newBookmarks.delete(predictionId);
      } else {
        newBookmarks.add(predictionId);
      }
      localStorage.setItem('bookmarkedPredictions', JSON.stringify([...newBookmarks]));
      return newBookmarks;
    });
  }, []);

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass-panel p-4 animate-pulse">
          <div className="aspect-video w-full mb-3 bg-[#1C1D20] border border-[#2A2B2F]"></div>
          <div className="space-y-3">
            <div className="h-4 bg-[#1C1D20] w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-[#111214]"></div>
              <div className="h-3 bg-[#111214] w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading || loadingTopicPredictions) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="glass-panel border-dashed border-[#EF4444]/30 p-12 text-center">
        <TrendingUp className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
        <h3 className="text-lg font-mono text-[#EF4444] uppercase tracking-widest mb-2">
          Connection Error
        </h3>
        <p className="text-sm font-mono text-[#A1A1AA]">
          Could not connect to smart contracts.
        </p>
      </div>
    );
  }

  if (filteredPredictions.length === 0) {
    return (
      <div className="glass-panel border-dashed p-12 text-center">
        <TrendingUp className="w-12 h-12 text-[#71717A] mx-auto mb-4" />
        <h3 className="text-lg font-mono text-[#A1A1AA] uppercase tracking-widest mb-2">
          No Markets Found
        </h3>
        <p className="text-sm font-mono text-[#71717A]">
          {searchQuery
            ? `No markets match "${searchQuery}".`
            : filter === 'bookmarked'
            ? "No saved markets."
            : "No active markets available."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {searchQuery && (
        <div className="text-xs font-mono text-[#71717A] uppercase">
          Found {filteredPredictions.length} market{filteredPredictions.length !== 1 ? 's' : ''} for "{searchQuery}"
        </div>
      )}

      <div className="space-y-4">
        {!searchQuery && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-semibold text-[#ECEDEE] uppercase tracking-widest m-0">
              {filter === 'trending' ? 'High Volume Markets' :
               filter === 'new' ? 'New Markets' :
               filter === 'ending-soon' ? 'Ending Soon' :
               filter === 'bookmarked' ? 'Saved Markets' :
               topicId ? 'Filtered Markets' :
               'All Markets'}
            </h2>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-[#111214] border border-[#1C1D20] text-[#A1A1AA] hover:text-[#ECEDEE] focus:outline-none focus:border-[#3B82F6] cursor-pointer rounded-none appearance-none"
              >
                <option value="newest">Latest Initialization</option>
                <option value="oldest">Oldest Initialization</option>
                <option value="volume-high">Max Volume</option>
                <option value="volume-low">Min Volume</option>
                <option value="ending-soon">Shortest TTL</option>
                <option value="ending-later">Longest TTL</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              isBookmarked={bookmarkedPredictions.has(prediction.id)}
              onBookmark={handleBookmark}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-[#1C1D20] bg-[#111214] text-[#71717A] hover:bg-[#161719] hover:text-[#ECEDEE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1;
            const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
            const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

            if (!showPage && !showEllipsis) return null;

            if (showEllipsis) {
              return (
                <span key={page} className="px-2 py-1.5 text-xs font-mono text-[#71717A]">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`min-w-[36px] px-3 py-1.5 text-xs font-mono transition-colors border rounded-none ${
                  currentPage === page
                    ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]'
                    : 'border-[#1C1D20] bg-[#111214] text-[#71717A] hover:bg-[#161719] hover:text-[#ECEDEE]'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-[#1C1D20] bg-[#111214] text-[#71717A] hover:bg-[#161719] hover:text-[#ECEDEE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PredictionGrid;


