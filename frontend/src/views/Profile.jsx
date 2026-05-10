import React, { useState, useEffect } from 'react';
import { useWallet } from '../core/useWallet';
import { usePredictions } from '../core/usePredictions';
import PredictionCard from '../modules/home/PredictionCard';
import LoadingSpinner from '../modules/common/LoadingSpinner';
import { userAPI, predictionAPI } from '../integrations/api';
import { formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const { isConnected, address, disconnect } = useWallet();
  const { getUserPositions, getPrediction, claimWinnings } = usePredictions();
  
  const [profile, setProfile] = useState(null);
  const [userPredictions, setUserPredictions] = useState([]);
  const [stats, setStats] = useState({
    totalPredictions: 0,
    activePredictions: 0,
    wonPredictions: 0,
    totalVolume: '0',
    totalWinnings: '0',
    winRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState('all'); // all, active, won, lost
  const [claimableWinnings, setClaimableWinnings] = useState([]);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }
    loadUserData();
  }, [isConnected, address]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProfile(),
        loadUserPredictions(),
        loadUserStats(),
        loadClaimableWinnings()
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const profileData = await userAPI.getProfile(address);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Create default profile if doesn't exist
      setProfile({
        address,
        joinedAt: new Date().toISOString(),
        username: null,
        avatar: null
      });
    }
  };

  const loadUserPredictions = async () => {
    try {
      const predictionsData = await getUserPositions();
      console.log('📊 User predictions loaded:', predictionsData);

      // Convert the basic user prediction data to full prediction information
      const enrichedPredictions = await Promise.all(
        predictionsData.map(async (userPrediction) => {
          try {
            const predictionDetails = await getPrediction(userPrediction.predictionId);
            return {
              ...predictionDetails,
              userPredictionInfo: userPrediction,
              isWon: predictionDetails.isResolved ?
                (predictionDetails.options && predictionDetails.options[userPrediction.optionIndex]?.isWinner) :
                null,
              selectedOption: userPrediction.optionIndex,
              userShares: userPrediction.shares,
              timestamp: userPrediction.timestamp
            };
          } catch (error) {
            console.error(`Error loading prediction ${userPrediction.predictionId}:`, error);
            return null;
          }
        })
      );

      // Filter out failed loads
      const validPredictions = enrichedPredictions.filter(prediction => prediction !== null);
      setUserPredictions(validPredictions);
    } catch (error) {
      console.error('Error loading user predictions:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // Calculate stats from actual user predictions data
      const userPredictionsData = await getUserPositions();

      const totalPredictions = userPredictionsData.length;
      let activePredictions = 0;
      let wonPredictions = 0;

      for (const userPrediction of userPredictionsData) {
        try {
          const predictionDetails = await getPrediction(userPrediction.predictionId);

          if (predictionDetails.isActive && !predictionDetails.isResolved) {
            activePredictions++;
          }

          if (predictionDetails.isResolved && predictionDetails.options?.[userPrediction.optionIndex]?.isWinner) {
            wonPredictions++;
          }
        } catch (error) {
          console.error(`Error checking prediction ${userPrediction.predictionId} for stats:`, error);
        }
      }

      const winRate = totalPredictions > 0 ? Math.round((wonPredictions / totalPredictions) * 100) : 0;

      setStats({
        totalPredictions,
        activePredictions,
        wonPredictions,
        totalVolume: '0', // Would need decryption for actual volume
        totalWinnings: '0', // Would need decryption for actual winnings
        winRate
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadClaimableWinnings = async () => {
    try {
      // For now, check which predictions the user won but hasn't claimed
      const userPredictionsData = await getUserPositions();
      const claimable = [];

      for (const userPrediction of userPredictionsData) {
        try {
          const predictionDetails = await getPrediction(userPrediction.predictionId);
          if (predictionDetails.isResolved &&
              predictionDetails.options?.[userPrediction.optionIndex]?.isWinner &&
              !userPrediction.claimed) {
            claimable.push({
              predictionId: userPrediction.predictionId,
              amount: '0.0', // Would need decryption to show actual amount
              title: predictionDetails.title
            });
          }
        } catch (error) {
          console.error(`Error checking prediction ${userPrediction.predictionId} for winnings:`, error);
        }
      }

      setClaimableWinnings(claimable);
    } catch (error) {
      console.error('Error loading claimable winnings:', error);
    }
  };

  const handleClaimWinnings = async (predictionId) => {
    try {
      const result = await claimWinnings(predictionId);

      if (result.success) {
        // Refresh data
        await loadClaimableWinnings();
        await loadUserStats();
        await loadUserPredictions();

        alert('Winnings claimed successfully!');
      }
    } catch (error) {
      console.error('Error claiming winnings:', error);
      alert('Failed to claim winnings: ' + error.message);
    }
  };

  const getFilteredPredictions = () => {
    let filtered = [...userPredictions];
    
    switch (filter) {
      case 'active':
        filtered = filtered.filter(prediction => 
          prediction.isActive && new Date() < new Date(prediction.endTime)
        );
        break;
      case 'won':
        filtered = filtered.filter(prediction => prediction.isWon === true);
        break;
      case 'lost':
        filtered = filtered.filter(prediction => prediction.isWon === false);
        break;
      default:
        // all - no additional filtering
        break;
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090A0B]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-[#ECEDEE] font-mono tracking-widest uppercase mb-4">Connect Your Wallet</h2>
          <p className="text-[#A1A1AA] font-mono mb-6">Please connect your wallet to view your profile</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredPredictions = getFilteredPredictions();

  return (
    <div className="min-h-screen site-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="glass-panel p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile?.username ? profile.username[0].toUpperCase() : '👤'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#ECEDEE] font-mono tracking-widest uppercase">
                  {profile?.username || formatAddress(address)}
                </h1>
                <p className="text-[#A1A1AA] font-mono">{formatAddress(address)}</p>
                <p className="text-sm text-[#71717A] font-mono">
                  Member since {formatDistanceToNow(new Date(profile?.joinedAt || Date.now()))} ago
                </p>
              </div>
            </div>
            
            <button
              onClick={disconnect}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="glass-panel p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎯</div>
              <div>
                <p className="text-sm font-medium text-[#A1A1AA] font-mono">Total Predictions</p>
                <p className="text-2xl font-bold text-[#ECEDEE] font-mono tracking-widest uppercase">{stats.totalPredictions}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔥</div>
              <div>
                <p className="text-sm font-medium text-[#A1A1AA] font-mono">Active Predictions</p>
                <p className="text-2xl font-bold text-primary-600">{stats.activePredictions}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🏆</div>
              <div>
                <p className="text-sm font-medium text-[#A1A1AA] font-mono">Win Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.winRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💰</div>
              <div>
                <p className="text-sm font-medium text-[#A1A1AA] font-mono">Total Winnings</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalWinnings} USDC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Claimable Winnings */}
        {claimableWinnings.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  🎉 Congratulations! You have winnings to claim
                </h3>
                <p className="text-green-700">
                  {claimableWinnings.length} prediction{claimableWinnings.length > 1 ? 's' : ''} with claimable winnings
                </p>
              </div>
              <div className="space-y-2">
                {claimableWinnings.map((winning, index) => (
                  <button
                    key={index}
                    onClick={() => handleClaimWinnings(winning.predictionId)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors block"
                  >
                    Claim {winning.amount} USDC
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="glass-panel mb-6">
          <div className="border-b border-[#1C1D20]">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'predictions', label: 'My Predictions' },
                { id: 'settings', label: 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-[#71717A] font-mono hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="glass-panel">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">Recent Activity</h4>
                  <div className="space-y-3">
                    {userPredictions.slice(0, 5).map((prediction, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-sm">{prediction.title}</p>
                          <p className="text-xs text-[#A1A1AA] font-mono">
                            {formatDistanceToNow(new Date(prediction.timestamp))} ago
                          </p>
                        </div>
                        <span className={`text-sm font-medium ${
                          prediction.isWon === true ? 'text-green-600' : 
                          prediction.isWon === false ? 'text-red-600' : 'text-[#A1A1AA] font-mono'
                        }`}>
                          {prediction.isWon === true ? 'Won' : prediction.isWon === false ? 'Lost' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA] font-mono">Total Volume</span>
                      <span className="font-medium">{stats.totalVolume} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA] font-mono">Predictions Won</span>
                      <span className="font-medium text-green-600">{stats.wonPredictions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA] font-mono">Predictions Lost</span>
                      <span className="font-medium text-red-600">
                        {stats.totalPredictions - stats.wonPredictions - stats.activePredictions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">My Predictions</h3>
                
                {/* Filter */}
                <div className="flex space-x-1 bg-[#1A2F45] rounded-lg p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Active' },
                    { id: 'won', label: 'Won' },
                    { id: 'lost', label: 'Lost' }
                  ].map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setFilter(filterOption.id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filter === filterOption.id
                          ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]'
                          : 'text-[#A1A1AA] font-mono hover:text-[#ECEDEE] font-mono tracking-widest uppercase'
                      }`}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {filteredPredictions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🎯</div>
                  <h4 className="text-lg font-semibold text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">No predictions found</h4>
                  <p className="text-[#A1A1AA] font-mono">
                    {filter === 'all' 
                      ? "You haven't placed any predictions yet." 
                      : `No ${filter} predictions found.`
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPredictions.map((prediction, index) => (
                    <PredictionCard
                      key={index}
                      prediction={prediction}
                      showUserPrediction={true}
                      onClick={() => window.location.href = `/prediction/${prediction.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username (optional)
                  </label>
                  <input
                    type="text"
                    value={profile?.username || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter a username"
                    className="w-full px-4 py-2 border border-[#1C1D20] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    disabled
                    className="w-full px-4 py-2 border border-[#1C1D20] rounded-lg bg-[#090A0B] text-[#71717A] font-mono"
                  />
                </div>
                
                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;


