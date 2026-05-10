import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PredictionGrid from '../modules/home/PredictionGrid';
import TopicTabs from '../modules/home/TopicTabs';
import { TrendingUp, Clock, Zap, Star } from 'lucide-react';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'trending');
  const [selectedTopic, setSelectedTopic] = useState(null);

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeFilter !== 'trending') {
      params.set('filter', activeFilter);
    } else {
      params.delete('filter');
    }
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    setSearchParams(params);
  }, [activeFilter, searchQuery, searchParams, setSearchParams]);

  const filters = [
    {
      id: 'trending',
      label: 'Trending',
      icon: TrendingUp,
      description: 'High volume markets'
    },
    {
      id: 'new',
      label: 'New',
      icon: Zap,
      description: 'New markets'
    },
    {
      id: 'ending-soon',
      label: 'Expiring',
      icon: Clock,
      description: 'Ending soon'
    },
    {
      id: 'bookmarked',
      label: 'Saved',
      icon: Star,
      description: 'Saved markets'
    }
  ];

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setSelectedTopic(null);
  };

  const handleTopicSelect = (topicId) => {
    setSelectedTopic(topicId);
    setActiveFilter('topic');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C1D20] pb-6">
          <div className="space-y-2">
              <h1 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest">Markets</h1>
              <p className="text-sm font-mono text-[#71717A] uppercase">Active Markets</p>
          </div>
      </div>

      <div className="border-b border-[#1C1D20] mb-6">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`py-4 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#3B82F6] text-[#ECEDEE]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {filter.label}
              </button>
            );
          })}
        </nav>
      </div>

      <TopicTabs 
        selectedTopic={selectedTopic} 
        onSelectTopic={handleTopicSelect} 
        activeFilter={activeFilter}
      />

      {searchQuery && (
        <div className="glass-panel p-4 mb-6 flex items-center justify-between border-l-2 border-l-[#3B82F6]">
          <p className="font-mono text-sm text-[#A1A1AA] uppercase">
            Executing query: <span className="text-[#ECEDEE] font-bold">"{searchQuery}"</span>
          </p>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete('search');
              setSearchParams(params);
            }}
            className="text-xs font-mono text-[#EF4444] hover:text-[#F87171] uppercase tracking-widest border border-[#EF4444]/30 px-3 py-1 bg-[#111214]"
          >
            Clear Query
          </button>
        </div>
      )}

      <div>
        <PredictionGrid
          filter={activeFilter}
          searchQuery={searchQuery}
          topicId={selectedTopic}
        />
      </div>

    </div>
  );
};

export default Home;


