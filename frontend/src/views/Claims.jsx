import React, { useState, useEffect } from 'react';
import { useWallet } from '../core/useWallet';
import { Trophy, CheckCircle, Clock, Loader2, Award, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import LoadingSpinner from '../modules/common/LoadingSpinner';

const Claims = () => {
  const { account, isConnected, signer, getPredictionHubContract, chainId } = useWallet();
  const [claimableBets, setClaimableBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState(new Set());

  useEffect(() => {
    if (isConnected && account) {
      loadClaimableBets();
    } else {
      setLoading(false);
    }
  }, [isConnected, account, chainId]);

  const loadClaimableBets = async () => {
    try {
      setLoading(true);
      const contract = getPredictionHubContract();
      
      const userBetsCount = await contract.getUserBetCount(account);
      const count = Number(userBetsCount);

      if (count === 0) {
        setClaimableBets([]);
        return;
      }

      const BATCH_SIZE = 5;
      const bets = [];

      for (let i = 0; i < count; i += BATCH_SIZE) {
        const remaining = count - i;
        const currentBatch = Math.min(BATCH_SIZE, remaining);
        
        const batchPromises = Array.from({ length: currentBatch }, async (_, index) => {
          const betIndex = i + index;
          try {
            const topicId = await contract.userBets(account, betIndex);
            const topic = await contract.topics(topicId);

            if (!topic.isResolved) return null;

            const [userBetAmount, hasClaimed] = await contract.getBetDetails(topicId, account, topic.winningChoice);

            if (Number(userBetAmount) > 0 && !hasClaimed) {
              const totalPool = Number(topic.totalStaked);
              const winningPool = Number(topic.poolSizes[topic.winningChoice]);
              let calculatedWinnings = 0;

              if (winningPool > 0) {
                const proportion = Number(userBetAmount) / winningPool;
                calculatedWinnings = (totalPool * proportion) * 0.98; // 2% fee
              }

              return {
                id: Number(topic.id),
                title: topic.title,
                winnings: (calculatedWinnings / 1000000).toFixed(2),
                userBetAmount: (Number(userBetAmount) / 1000000).toFixed(2),
              };
            }
            return null;
          } catch (e) {
            console.error(`Error processing bet index ${betIndex}:`, e);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        bets.push(...batchResults.filter(Boolean));
      }

      setClaimableBets(bets);
    } catch (error) {
      console.error('Error loading claimable bets:', error);
      toast.error('Failed to load claimable claims');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (topicId) => {
    if (!isConnected || !signer) return;

    try {
      setClaimingIds(prev => new Set(prev).add(topicId));
      const contract = getPredictionHubContract();
      
      const tx = await contract.claimWinnings(topicId, { gasLimit: 500000 });
      toast.loading('Processing Claim Settlement...', { id: `claim-${topicId}` });
      
      await tx.wait();
      
      toast.success('Settlement Complete', { id: `claim-${topicId}` });
      
      setClaimableBets(prev => prev.filter(bet => bet.id !== topicId));
      
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Settlement Failed', { id: `claim-${topicId}` });
    } finally {
      setClaimingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(topicId);
        return newSet;
      });
    }
  };

  const handleClaimAll = async () => {
    if (!isConnected || !signer || claimableBets.length === 0) return;

    try {
      const allIds = claimableBets.map(b => b.id);
      setClaimingIds(new Set(allIds));
      
      const contract = getPredictionHubContract();
      const tx = await contract.claimBatchWinnings(allIds, { gasLimit: 1000000 });
      
      toast.loading('Processing claims...', { id: 'claim-all' });
      await tx.wait();
      
      toast.success('Claims processed successfully', { id: 'claim-all' });
      setClaimableBets([]);
      
    } catch (error) {
      console.error('Batch claim error:', error);
      toast.error(error.message || 'Claim processing failed', { id: 'claim-all' });
      
      setClaimingIds(new Set());
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center">
          <div className="text-center font-mono glass-panel p-8 max-w-md w-full">
              <AlertCircle className="w-12 h-12 text-[#71717A] mx-auto mb-6" />
              <h2 className="text-xl text-[#ECEDEE] tracking-widest uppercase mb-2">Wallet Not Connected</h2>
              <p className="text-[#A1A1AA] text-sm mb-8 leading-relaxed">
                  Connect your wallet to process settlements.
              </p>
          </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalWinnings = claimableBets.reduce((sum, bet) => sum + parseFloat(bet.winnings), 0).toFixed(2);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C1D20] pb-6">
          <div className="space-y-2">
              <h1 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest">Claims</h1>
              <p className="text-sm font-mono text-[#71717A] uppercase">Claim your winnings from resolved markets</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border-l-2 border-l-[#10B981]">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-mono font-medium text-[#A1A1AA] uppercase tracking-widest">Claimable Markets</span>
          </div>
          <p className="text-4xl font-mono font-bold text-[#ECEDEE]">{claimableBets.length}</p>
        </div>

        <div className="glass-panel p-6 border-l-2 border-l-[#3B82F6]">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-xs font-mono font-medium text-[#A1A1AA] uppercase tracking-widest">Total Winnings</span>
              </div>
              <p className="text-4xl font-mono font-bold text-[#ECEDEE]">{totalWinnings} <span className="text-xl text-[#71717A]">USDC</span></p>
            </div>
            
            {claimableBets.length > 1 && (
              <button
                onClick={handleClaimAll}
                disabled={claimingIds.size > 0}
                className="mt-4 btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claimingIds.size > 0 ? <LoadingSpinner size="sm" /> : 'Claim All Winnings'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {claimableBets.length === 0 ? (
          <div className="glass-panel p-12 text-center text-[#71717A] font-mono text-sm border-dashed">
            No pending settlements detected in network.
          </div>
        ) : (
          <div className="space-y-4">
            {claimableBets.map((bet) => (
              <div key={bet.id} className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-mono text-[#ECEDEE] mb-2">{bet.title}</h3>
                  <div className="flex gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[#71717A] uppercase mr-2">Input:</span>
                      <span className="text-[#A1A1AA]">{bet.userBetAmount} USDC</span>
                    </div>
                    <div>
                      <span className="text-[#71717A] uppercase mr-2">Output:</span>
                      <span className="text-[#10B981]">{bet.winnings} USDC</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(bet.id)}
                  disabled={claimingIds.has(bet.id)}
                  className="bg-[#111214] hover:bg-[#161719] text-[#10B981] border border-[#10B981]/50 hover:border-[#10B981] px-6 py-2 flex items-center justify-center min-w-[140px] font-mono text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {claimingIds.has(bet.id) ? <LoadingSpinner size="sm" className="text-[#10B981]" /> : 'Settle'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Claims;


