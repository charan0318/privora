import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTopics } from '../../core/useTopics';

const TopicTabs = ({ onSelectTopic, selectedTopic, className = '' }) => {
  const { topLevelTopics, loading } = useTopics();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scrollContainerRef = React.useRef(null);

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
    if (typeof onSelectTopic === 'function') {
        onSelectTopic(topicId === selectedTopic ? null : topicId);
    }
  };

  if (loading) {
    return (
      <div className={`flex space-x-3 overflow-hidden mb-8 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-24 h-8 bg-[#1C1D20]"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative mb-8 ${className}`}>
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#090A0B] border border-[#1C1D20] p-1.5 hover:border-[#3B82F6] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#A1A1AA]" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex space-x-3 overflow-x-auto scrollbar-hide py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => handleTopicClick(null)}
          className={`flex-shrink-0 px-4 py-1.5 text-xs font-mono tracking-widest uppercase transition-all border ${
            selectedTopic === null
              ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]'
              : 'bg-[#111214] border-[#1C1D20] text-[#71717A] hover:text-[#A1A1AA] hover:border-[#71717A]'
          }`}
        >
          All Categories
        </button>

        {topLevelTopics?.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicClick(topic.id)}
            className={`flex-shrink-0 px-4 py-1.5 text-xs font-mono tracking-widest uppercase transition-all border flex items-center gap-2 ${
              selectedTopic === topic.id
                ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]'
                : 'bg-[#111214] border-[#1C1D20] text-[#71717A] hover:text-[#A1A1AA] hover:border-[#71717A]'
            }`}
          >
            {topic.icon && <span>{topic.icon}</span>}
            {topic.name}
          </button>
        ))}
      </div>

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#090A0B] border border-[#1C1D20] p-1.5 hover:border-[#3B82F6] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
        </button>
      )}
    </div>
  );
};

export default TopicTabs;


