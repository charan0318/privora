import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useWallet } from '../core/useWallet';
import { AlertCircle, TrendingUp, Clock, Award, XCircle, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../modules/common/LoadingSpinner';
import { getPredictionRouteId } from '../utils/getPredictionRouteId';

const Dashboard = () => {
  const { account, isConnected, getPredictionHubContract, signer } = useWallet();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeBets, setActiveBets] = useState([]);
  const [endedBets, setEndedBets] = useState([]);
  const [claimableBets, setClaimableBets] = useState([]);

  useEffect(() => {
    if (isConnected && account) {
      loadDashboardData();
    }
  }, [isConnected, account]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = getPredictionHubContract();
      
      const userBetsCount = await contract.getUserBetCount(account);
      const count = Number(userBetsCount);

      if (count === 0) {
        setIsLoading(false);
        return;
      }

      const bets = [];
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < count; i += BATCH_SIZE) {
        const remaining = count - i;
        const currentBatch = Math.min(BATCH_SIZE, remaining);
        
        const batchPromises = Array.from({ length: currentBatch }, async (_, index) => {
          const betId = i + index;
          try {
            const topicId = await contract.userBets(account, betId);
            const topic = await contract.topics(topicId);
            
            return {
              id: Number(topic.id),
              title: topic.title,
              description: topic.description,
              endTime: Number(topic.endTime) * 1000,
              isResolved: topic.isResolved,
              winningChoice: topic.winningChoice,
              totalStaked: topic.totalStaked.toString()
            };
          } catch (e) {
            console.error(`Error loading bet ${betId}:`, e);
            return null;
          }
        });

        const batchResults = (await Promise.all(batchPromises)).filter(Boolean);
        
        const uniqueBetsMap = new Map();
        batchResults.forEach(bet => {
          if (!uniqueBetsMap.has(bet.id)) {
            uniqueBetsMap.set(bet.id, bet);
          }
        });
        
        bets.push(...Array.from(uniqueBetsMap.values()));
      }

      const active = bets.filter(bet => !bet.isResolved && bet.endTime > Date.now());
      const ended = bets.filter(bet => !bet.isResolved && bet.endTime <= Date.now());
      const claimable = bets.filter(bet => bet.isResolved);

      setActiveBets(active);
      setEndedBets(ended);
      setClaimableBets(claimable);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please switch network.');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center">
          <div className="text-center font-mono glass-panel p-8 max-w-md w-full">
              <AlertCircle className="w-12 h-12 text-[#71717A] mx-auto mb-6" />
              <h2 className="text-xl text-[#ECEDEE] tracking-widest uppercase mb-2">Wallet Not Connected</h2>
              <p className="text-[#A1A1AA] text-sm mb-8 leading-relaxed">
                  Connect your wallet to view your positions.
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary w-full"
              >
                  Return to Markets
              </button>
          </div>
      </div>
    );
  }

  const renderBetCard = (prediction) => {
    const isLost = prediction.isResolved && false; // Still TBD on bet verification
    const isClaimed = false; // Add claim status check later

    return (
      <div
        key={prediction.id}
        className="glass-panel p-6 hover:border-[#3B82F6] transition-colors cursor-pointer group"
        onClick={() => {
          const predictionId = getPredictionRouteId(prediction);
          if (predictionId) {
            navigate(`/prediction/${predictionId}`);
          }
        }}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-mono font-medium text-[#ECEDEE] mb-2">{prediction.title}</h3>
            <p className="text-sm font-mono text-[#71717A] line-clamp-2">{prediction.description}</p>
          </div>
          <div className="ml-4 flex flex-col gap-2 relative">
            {prediction.isResolved ? (
              <span className="px-2 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-none text-[10px] font-mono tracking-widest uppercase">
                Resolved
              </span>
            ) : prediction.endTime < Date.now() ? (
              <span className="px-2 py-1 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 rounded-none text-[10px] font-mono tracking-widest uppercase">
                Ended
              </span>
            ) : (
              <span className="px-2 py-1 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 rounded-none text-[10px] font-mono tracking-widest uppercase relative overflow-hidden">
                <span className="relative z-10">Active</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3B82F6]/20 to-transparent -translate-x-[150%] animate-[scan_2s_ease-in-out_infinite]" />
              </span>
            )}
            {isLost && (
              <span className="px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 rounded-none text-[10px] font-mono tracking-widest uppercase flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            )}
            {isClaimed && !isLost && (
              <span className="px-2 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-none text-[10px] font-mono tracking-widest uppercase flex items-center gap-1">
                Claimed
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#1C1D20] pt-4">
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] font-mono text-[#71717A] uppercase tracking-widest mb-1">Total Pool</p>
              <p className="text-sm font-mono text-[#ECEDEE]">{(Number(prediction.totalStaked) / 1000000).toFixed(2)} USDC</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-mono text-[#71717A] uppercase tracking-widest mb-1">
              {prediction.endTime < Date.now() ? 'Ended On' : 'Closes In'}
            </p>
            <p className="text-sm font-mono text-[#ECEDEE]">
              {new Date(prediction.endTime).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen site-background py-8 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C1D20] pb-6">
          <div className="space-y-2">
              <h1 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest">Portfolio</h1>
              <p className="text-sm font-mono text-[#71717A] uppercase">Your Positions</p>
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-l-2 border-l-[#3B82F6]">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-mono font-medium text-[#A1A1AA] uppercase tracking-widest">Open Positions</span>
          </div>
          <p className="text-4xl font-mono font-bold text-[#ECEDEE]">{activeBets.length}</p>
        </div>

        <div className="glass-panel p-6 border-l-2 border-l-[#71717A]">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-4 h-4 text-[#71717A]" />
            <span className="text-xs font-mono font-medium text-[#A1A1AA] uppercase tracking-widest">Archived</span>
          </div>
          <p className="text-4xl font-mono font-bold text-[#ECEDEE]">{endedBets.length}</p>
        </div>

        <div className="glass-panel p-6 border-l-2 border-l-[#10B981]">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-mono font-medium text-[#A1A1AA] uppercase tracking-widest">Settled</span>
          </div>
          <p className="text-4xl font-mono font-bold text-[#ECEDEE]">{claimableBets.length}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#1C1D20] mt-8">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              activeTab === 'active'
                ? 'border-[#3B82F6] text-[#ECEDEE]'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            Active ({activeBets.length})
          </button>
          <button
            onClick={() => setActiveTab('ended')}
            className={`py-4 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              activeTab === 'ended'
                ? 'border-[#3B82F6] text-[#ECEDEE]'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            Archived ({endedBets.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`py-4 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              activeTab === 'claims'
                ? 'border-[#3B82F6] text-[#ECEDEE]'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            Settled ({claimableBets.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'active' && (
          activeBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeBets.map(renderBetCard)}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-[#71717A] font-mono text-sm border-dashed">
              No active positions
            </div>
          )
        )}

        {activeTab === 'ended' && (
          endedBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {endedBets.map(renderBetCard)}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-[#71717A] font-mono text-sm border-dashed">
              No archived markets
            </div>
          )
        )}

        {activeTab === 'claims' && (
          claimableBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {claimableBets.map(renderBetCard)}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-[#71717A] font-mono text-sm border-dashed">
              No pending settlements
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default Dashboard;


