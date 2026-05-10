import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Power, Copy, ExternalLink, Shield, LayoutDashboard } from 'lucide-react';
import { useWallet } from '../../core/useWallet';
import { hasAnyAdminPrivileges, getUserDisplayInfo } from '../../utils/adminUtils';
import { useNavigate } from 'react-router-dom';
import { getFhevmInstance } from '../../lib/fhe';
import toast from 'react-hot-toast';

const WalletConnect = () => {
  const {
    account,
    isConnected,
    isConnecting,
    provider,
    signer,
    connect,
    disconnect,
    currentNetwork,
    networkInfo
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState('0');
  const [fheInitialized, setFheInitialized] = useState(false);
  const navigate = useNavigate();

  // Check admin privileges
  const hasAdminAccess = hasAnyAdminPrivileges(account);
  const displayInfo = getUserDisplayInfo(account);

  // Get network color based on current network
  const getNetworkColor = () => {
    switch (currentNetwork) {
      case 'localhost':
        return 'bg-[#10B981]';
      case 'sepolia':
        return 'bg-[#3B82F6]';
      default:
        return 'bg-[#71717A]';
    }
  };

  // Get balance when connected
  useEffect(() => {
    if (isConnected && provider && account) {
      getBalance();
    }
  }, [isConnected, provider, account]);

  // Check FHEVM status periodically (let useFHEVM hook handle initialization)
  useEffect(() => {
    if (isConnected && account) {
      const checkFHEVMStatus = async () => {
        try {
          const instance = await getFhevmInstance();
          setFheInitialized(!!instance);
        } catch (err) {
          // FHEVM initialization failed - this is expected if relayer is unavailable
          // Don't log errors to avoid console spam
          setFheInitialized(false);
        }
      };

      checkFHEVMStatus();
      const interval = setInterval(checkFHEVMStatus, 5000);
      return () => clearInterval(interval);
    } else {
      setFheInitialized(false);
    }
  }, [isConnected, account]);

  const getBalance = async () => {
    try {
      const balance = await provider.getBalance(account);
      const formattedBalance = ethers.formatEther(balance);
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error getting balance:', error);
      setBalance('0');
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    toast.success('Address copied to clipboard');
  };

  const openEtherscan = () => {
    window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank');
  };

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Wallet connected successfully');
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
    toast.success('Wallet disconnected');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    setShowDropdown(false);
  };

  const handleAdminPanel = () => {
    navigate('/admin');
    setShowDropdown(false);
    toast.success('Redirecting to Admin Panel');
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="btn-primary"
      >
        <Wallet className="w-4 h-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-[#111214] border border-[#1C1D20] text-[#ECEDEE] font-mono text-xs uppercase tracking-widest hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors rounded-none"
      >
        <div className={`w-2 h-2 bg-[#10B981] rounded-full ${fheInitialized ? 'animate-pulse' : ''}`}></div>
        {formatAddress(account)}
      </button>

      {showDropdown && (
        <div className="absolute right-0 absolute right-0 mt-2 w-80 glass-panel z-50">
          <div className="p-4 border-b border-[#1C1D20] dark:border-[#1C1D20]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A1A1AA] font-mono dark:text-[#71717A] font-mono">Connected</span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 ${getNetworkColor()} rounded-full animate-pulse`}></div>
                <span className="text-sm text-[#ECEDEE] font-mono capitalize">
                  {networkInfo?.name || currentNetwork}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm">{formatAddress(account)}</span>
              {hasAdminAccess && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${displayInfo.bgColor} ${displayInfo.color}`}>
                  <span>{displayInfo.badge}</span>
                  {displayInfo.label}
                </span>
              )}
              <button
                onClick={copyAddress}
                className="p-1 hover:bg-[#111214] rounded-none"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={openEtherscan}
                className="p-1 hover:bg-[#111214] rounded-none"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-[#A1A1AA] font-mono dark:text-[#71717A] font-mono">
              Balance: {parseFloat(balance).toFixed(7)} ETH
            </div>
          </div>
          
          <div className="p-2 space-y-2">
            {hasAdminAccess && (
              <button
                onClick={handleAdminPanel}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#ECEDEE] font-mono hover:bg-[#111214] rounded-none transition-colors border border-transparent hover:border-[#1C1D20]"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleDashboard}
              className="w-full flex items-center gap-2 px-3 py-2 text-[#A1A1AA] font-mono hover:bg-[#111214] dark:bg-transparent rounded-none transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-3 py-2 text-[#EF4444] hover:bg-[#111214] rounded-none transition-colors border border-transparent hover:border-[#1C1D20]"
            >
              <Power className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;


