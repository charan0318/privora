import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = null, 
  fullScreen = false,
  className = '',
  ...props 
}) => {
  return null;
};

// Skeleton loading component
export const SkeletonLoader = ({ 
  lines = 3, 
  className = '',
  lineHeight = 'h-4',
  spacing = 'space-y-3'
}) => (
  <div className={`animate-pulse ${spacing} ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <div
        key={index}
        className={`bg-[#1A2F45] rounded ${lineHeight} ${
          index === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

// Card skeleton loader
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-[#0A1424] rounded-xl shadow-sm border border-[#1A2F45] p-6 ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-[#1A2F45] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#1A2F45] rounded w-3/4" />
          <div className="h-3 bg-[#1A2F45] rounded w-1/2" />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <div className="h-4 bg-[#1A2F45] rounded" />
        <div className="h-4 bg-[#1A2F45] rounded w-5/6" />
        <div className="h-4 bg-[#1A2F45] rounded w-4/6" />
      </div>
      
      {/* Footer */}
      <div className="flex justify-between items-center mt-6">
        <div className="h-8 bg-[#1A2F45] rounded w-20" />
        <div className="h-8 bg-[#1A2F45] rounded w-24" />
      </div>
    </div>
  </div>
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-[#0A1424] rounded-xl shadow-sm border border-[#1A2F45] overflow-hidden ${className}`}>
    <div className="animate-pulse">
      {/* Table Header */}
      <div className="bg-[#0F1E32] px-6 py-3 border-b border-[#1A2F45]">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, index) => (
            <div key={index} className="h-4 bg-[#1A2F45] rounded flex-1" />
          ))}
        </div>
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-[#1A2F45] last:border-b-0">
          <div className="flex space-x-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <div 
                key={colIndex} 
                className={`h-4 bg-[#1A2F45] rounded flex-1 ${
                  colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-1/6' : ''
                }`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Button loading state
export const LoadingButton = ({ 
  loading = false, 
  children, 
  disabled = false,
  className = '',
  size = 'md',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        border transition-all duration-200 focus:outline-none focus:ring-2 
        focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${loading ? 'cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} color="current" />
      )}
      {children}
    </button>
  );
};

// Page loading component
export const PageLoader = ({ message = 'Loading...' }) => null;

// Inline loading state
export const InlineLoader = ({ text = 'Loading...', className = '' }) => null;

// Overlay loading component
export const OverlayLoader = ({ show = false, message = 'Loading...' }) => null;

// Loading states for different components
export const BetCardSkeleton = () => (
  <CardSkeleton className="hover:shadow-lg transition-shadow duration-200" />
);

export const ProfileSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="bg-[#0A1424] rounded-xl p-6 border border-[#1A2F45]">
      <div className="animate-pulse flex items-center space-x-4">
        <div className="w-16 h-16 bg-[#1A2F45] rounded-full" />
        <div className="flex-1">
          <div className="h-6 bg-[#1A2F45] rounded w-1/3 mb-2" />
          <div className="h-4 bg-[#1A2F45] rounded w-1/2" />
        </div>
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="bg-[#0A1424] rounded-xl p-6 border border-[#1A2F45]">
          <div className="animate-pulse">
            <div className="h-4 bg-[#1A2F45] rounded w-2/3 mb-2" />
            <div className="h-8 bg-[#1A2F45] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Content */}
    <TableSkeleton rows={8} columns={5} />
  </div>
);

export default LoadingSpinner;


