import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Clock, TrendingUp, Hexagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BASE_URL } from '../../integrations/predictionSyncAPI';

const PredictionCard = ({ prediction, isBookmarked, onBookmark }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleCardClick = (e) => {
    if (e.target.closest('.bookmark-btn') || e.target.closest('.option-btn')) return;
    const predictionId = prediction.contractId || prediction.id || prediction._id;
    if (predictionId) {
      navigate(`/prediction/${predictionId}`);
    }
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    onBookmark(prediction._id || prediction.id);
  };

  const formatPercentage = (price) => `${Math.round(price)}%`;

  const formatVolume = (volume) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}k`;
    return `$${volume}`;
  };

  const isLive = prediction.mustShowLive &&
    prediction.liveStartTime && prediction.liveEndTime &&
    Date.now() >= new Date(prediction.liveStartTime).getTime() &&
    Date.now() <= new Date(prediction.liveEndTime).getTime();

  const getOptionTitle = (option) => {
    if (typeof option === 'string') return option;
    if (!option || typeof option !== 'object') return '';
    if (option.groupTitle) return option.groupTitle;
    if (option.title) return option.title;
    if (option.name) return option.name;
    const keys = Object.keys(option).filter(key => !isNaN(key)).sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0) return keys.map(key => option[key]).join('');
    return 'Option';
  };

  const renderPredictionContent = () => {
    if (!prediction.options || prediction.options.length === 0) return null;

    const predictionType = Number(prediction.predictionType);

    if (predictionType === 0 && prediction.options.length === 2) {
      const yesOption = prediction.options[0];
      const noOption = prediction.options[1];
      const yesText = getOptionTitle(yesOption);
      const noText = getOptionTitle(noOption);

      const liquidityParam = prediction.liquidityParam || 100;
      const liqPer = liquidityParam / 2;
      const yesTotal = (yesOption.totalShares || 0) + liqPer;
      const noTotal = (noOption.totalShares || 0) + liqPer;
      const totalShares = yesTotal + noTotal;

      const yesPrice = totalShares > 0 ? Math.max(0.1, Math.min(99.9, (yesTotal / totalShares) * 100)) : 50;
      const noPrice = totalShares > 0 ? Math.max(0.1, Math.min(99.9, (noTotal / totalShares) * 100)) : 50;

      return (
        <div className="flex gap-2 mt-4">
          <button className="option-btn flex-1 bg-[#161719] border border-[#1C1D20] hover:border-[#3B82F6] hover:bg-[#1A1E24] px-4 py-3 rounded-none transition-colors flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#ECEDEE]">{yesText || 'Yes'}</span>
            <span className="font-mono text-[#3B82F6] font-bold">{formatPercentage(yesPrice)}</span>
          </button>
          <button className="option-btn flex-1 bg-[#161719] border border-[#1C1D20] hover:border-[#EF4444] hover:bg-[#1A1A1A] px-4 py-3 rounded-none transition-colors flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#ECEDEE]">{noText || 'No'}</span>
            <span className="font-mono text-[#EF4444] font-bold">{formatPercentage(noPrice)}</span>
          </button>
        </div>
      );
    }

    // MULTIPLE OR NESTED: map standard options
    const totalShares = prediction.options.reduce((acc, opt) => acc + (opt.totalShares || 0), 0) || 1;
    return (
      <div className="space-y-2 mt-4">
        {prediction.options.slice(0, 3).map((opt, i) => {
          const price = ((opt.totalShares || 0) / totalShares * 100) || 0;
          return (
            <div key={i} className="flex justify-between items-center bg-[#161719] border border-[#1C1D20] p-3 rounded-none">
              <span className="font-mono text-xs text-[#ECEDEE] uppercase truncate mr-4">{getOptionTitle(opt)}</span>
              <span className="font-mono text-sm text-[#3B82F6]">{price.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      onClick={handleCardClick}
      className="glass-panel cursor-pointer flex flex-col transition-all hover:border-[#2C2D30] group relative overflow-hidden"
    >
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {!imageError && prediction.imageUrl ? (
              <img 
                src={prediction.imageUrl?.startsWith('http') ? prediction.imageUrl : `${BASE_URL}${prediction.imageUrl}`} 
                alt={prediction.title}
                onError={() => setImageError(true)}
                className="w-8 h-8 rounded-none object-cover border border-[#1C1D20] grayscale group-hover:grayscale-0 transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-none bg-[#161719] border border-[#1C1D20] flex items-center justify-center">
                <Hexagon className="w-4 h-4 text-[#71717A]" />
              </div>
            )}
            {prediction.category && (
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#71717A]">
                {typeof prediction.category === 'object' ? prediction.category.name : prediction.category}
              </span>
            )}
          </div>
          <button 
            onClick={handleBookmarkClick}
            className="bookmark-btn text-[#71717A] hover:text-[#3B82F6] transition-colors"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-[#3B82F6]" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        <h3 className="text-[#ECEDEE] font-medium leading-relaxed mb-4 group-hover:text-[#3B82F6] transition-colors line-clamp-2">
          {prediction.title}
        </h3>

        {renderPredictionContent()}
      </div>

      <div className="p-3 border-t border-[#1C1D20] bg-[#161719] flex justify-between items-center z-10">
        <div className="flex items-center gap-3 font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#3B82F6]" />
            {formatVolume(prediction.volume || 0)}
          </div>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-[#71717A]">
          <Clock className="w-3 h-3" />
          {prediction.endTime ? formatDistanceToNow(new Date(prediction.endTime)) : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default PredictionCard;


