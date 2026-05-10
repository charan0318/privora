import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTopics } from '../../core/useTopics';

const TopicTabs = ({ onTopicSelect, selectedTopic, className = '' }) => {
  const { topLevelTopics, loading } = useTopics();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scrollContainerRef = React.useRef(null);

  // Check scroll position and arrow visibility
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [topLevelTopics]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newPosition = scrollPosition + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  const handleTopicClick = (topicId) => {
    onTopicSelect(topicId === selectedTopic ? null : topicId);
  };

  if (loading) {
    return (
      <div className={`flex space-x-3 overflow-hidden ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-24 h-8 bg-[#233F59] dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#0A1424] dark:bg-gray-800 shadow-lg rounded-full p-2 hover:bg-[#0F1E32] dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-gray-400" />
        </button>
      )}

      {/* Topics container */}
      <div
        ref={scrollContainerRef}
        className="flex space-x-3 overflow-x-auto scrollbar-hide py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All Topics */}
        <button
          onClick={() => handleTopicClick(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedTopic === null
              ? 'bg-primary-500 text-white'
              : 'bg-[#1A2F45] dark:bg-gray-800 text-gray-300 dark:text-gray-300 hover:bg-[#233F59] dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>

        {/* Topic buttons */}
        {topLevelTopics?.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicClick(topic.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedTopic === topic.id
                ? 'bg-primary-500 text-white'
                : 'bg-[#1A2F45] dark:bg-gray-800 text-gray-300 dark:text-gray-300 hover:bg-[#233F59] dark:hover:bg-gray-700'
            }`}
          >
            {topic.icon && <span className="mr-1">{topic.icon}</span>}
            {topic.name}
          </button>
        ))}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#0A1424] dark:bg-gray-800 shadow-lg rounded-full p-2 hover:bg-[#0F1E32] dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default TopicTabs;


