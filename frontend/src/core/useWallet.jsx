import { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { getContracts, getNetworkConfig, NETWORK_CONFIGS } from '../config/contracts.js';
import LoadingScreen from '../modules/common/LoadingScreen';
import PredictionHubABI from '@artifacts/PredictionHub.sol/PredictionHub.json';
import SettlementEngineABI from '@artifacts/SettlementEngine.sol/SettlementEngine.json';
import IntelligenceLedgerABI from '@artifacts/IntelligenceLedger.sol/IntelligenceLedger.json';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [chainId, setChainId] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState('localhost');

  // Local development configuration for Hardhat
  const LOCAL_CHAIN_ID = '0x7a69'; // 31337 in hex
  const LOCAL_CONFIG = {
    chainId: LOCAL_CHAIN_ID,
    chainName: 'Hardhat Local Network',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
  };

  // Sepolia testnet configuration
  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
  const SEPOLIA_CONFIG = {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [import.meta.env.VITE_FHEVM_NETWORK_URL],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
  };

  // Initialize provider and check for existing connection
  useEffect(() => {
    initializeProvider();
  }, []);

  const detectCurrentNetwork = (chainId) => {
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
    if (chainIdNum === 31337) return 'localhost';
    if (chainIdNum === 11155111) return 'sepolia';
    return 'localhost'; // default
  };

  const initializeProvider = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();
      
      if (ethereumProvider && ethereumProvider.isMetaMask) {
        const ethersProvider = new ethers.BrowserProvider(ethereumProvider);
        setProvider(ethersProvider);

        // Check if already connected
        const accounts = await ethereumProvider.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          const signer = await ethersProvider.getSigner();
          setAccount(accounts[0]);
          setSigner(signer);
          setIsConnected(true);
          
          // Get chain ID and detect network
          const network = await ethersProvider.getNetwork();
          const chainIdHex = `0x${network.chainId.toString(16)}`;
          setChainId(chainIdHex);

          // Auto detect current network
          const detectedNetwork = detectCurrentNetwork(chainIdHex);
          setCurrentNetwork(detectedNetwork);
        }

        // Listen for account changes
        ethereumProvider.on('accountsChanged', handleAccountsChanged);
        ethereumProvider.on('chainChanged', handleChainChanged);
        ethereumProvider.on('disconnect', handleDisconnect);

      } else {
        console.warn('MetaMask not detected');
      }
    } catch (error) {
      console.error('Error initializing provider:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      const ethereumProvider = await detectEthereumProvider();
      
      if (!ethereumProvider) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await ethereumProvider.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const ethersProvider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await ethersProvider.getSigner();
      const network = await ethersProvider.getNetwork();
      
      const chainIdHex = `0x${network.chainId.toString(16)}`;

      setProvider(ethersProvider);
      setSigner(signer);
      setAccount(accounts[0]);
      setIsConnected(true);
      setChainId(chainIdHex);

      // Auto detect and set current network based on chain ID
      const detectedNetwork = detectCurrentNetwork(chainIdHex);
      setCurrentNetwork(detectedNetwork);

      console.log(`🌐 Connected to ${detectedNetwork} network`);

      // No automatic network switching - let user choose

    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setChainId(null);
  };

  const switchToLocal = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();

      // Try to switch to local hardhat network
      await ethereumProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: LOCAL_CHAIN_ID }],
      });
    } catch (switchError) {
        /* If the chain hasn't been added, add it */
      if (switchError.code === 4902) {
        try {
          await ethereumProvider.request({
            method: 'wallet_addEthereumChain',
            params: [LOCAL_CONFIG],
          });
        } catch (addError) {
          console.error('Error adding local network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to local network:', switchError);
        throw switchError;
      }
    }
  };

  const switchToSepolia = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();

      // Try to switch to Sepolia testnet
      await ethereumProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
        /* If the chain hasn't been added, add it */
      if (switchError.code === 4902) {
        try {
          await ethereumProvider.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_CONFIG],
          });
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Sepolia:', switchError);
        throw switchError;
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
        /* Reinitialize signer with new account */
        if (provider) {
          provider.getSigner().then(setSigner);
        }
      }
    };

    const handleChainChanged = async (newChainId) => {
      console.log('🔄 Network changed to:', newChainId);
      setChainId(newChainId);

      // Reinitialize provider and signer after network change
      try {
        const ethereumProvider = await detectEthereumProvider();
        if (ethereumProvider) {
          const ethersProvider = new ethers.BrowserProvider(ethereumProvider);
          setProvider(ethersProvider);

          if (account) {
            const signer = await ethersProvider.getSigner();
            setSigner(signer);
          }
        }
      } catch (error) {
        console.error('Error reinitializing after network change:', error);
        // Reload page as fallback
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    const signMessage = async (message) => {
      if (!signer) {
        throw new Error('No signer available');
      }
      return await signer.signMessage(message);
    };

    const getContract = (contractAddress, abi) => {
      if (!signer) {
        throw new Error('No signer available');
      }
      return new ethers.Contract(contractAddress, abi, signer);
    };

    const switchNetwork = async (networkName) => {
      const networkConfig = NETWORK_CONFIGS[networkName];
      if (!networkConfig) return;

      try {
        const ethereumProvider = await detectEthereumProvider();
        const hexChainId = `0x${networkConfig.chainId.toString(16)}`;

        // Try to switch to the network
        try {
          await ethereumProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          });
        } catch (switchError) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            const networkParams = {
              chainId: hexChainId,
              chainName: networkConfig.name,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: networkConfig.blockExplorerUrl ? [networkConfig.blockExplorerUrl] : [],
            };

            await ethereumProvider.request({
              method: 'wallet_addEthereumChain',
              params: [networkParams],
            });
          } else {
            throw switchError;
          }
        }

        setCurrentNetwork(networkName);
      } catch (error) {
        console.error(`Error switching to ${networkName}:`, error);
        throw error;
      }
    };

    const getPredictionHubContract = (readOnly = false) => {
      // For read-only operations, use provider instead of signer
      const signerOrProvider = readOnly ? provider : signer;

      if (!signerOrProvider) {
        throw new Error(readOnly ? 'No provider available' : 'No signer available');
      }

      // Use dynamic contract config based on current network
      const contracts = getContracts(chainId);
      const contractAddress = contracts.PREDICTION_HUB;

      if (!contractAddress) {
        throw new Error('PredictionHub contract address not configured for this network');
      }

      return new ethers.Contract(contractAddress, PredictionHubABI.abi, signerOrProvider);
    };

    const getSettlementEngineContract = (readOnly = false) => {
      const signerOrProvider = readOnly ? provider : signer;

      if (!signerOrProvider) {
        throw new Error(readOnly ? 'No provider available' : 'No signer available');
      }

      const contracts = getContracts(chainId);
      const contractAddress = contracts.SETTLEMENT_ENGINE;

      if (!contractAddress) {
        throw new Error('SettlementEngine contract address not configured for this network');
      }

      return new ethers.Contract(contractAddress, SettlementEngineABI.abi, signerOrProvider);
    };

    const getIntelligenceLedgerContract = (readOnly = false) => {
      const signerOrProvider = readOnly ? provider : signer;

      if (!signerOrProvider) {
        throw new Error(readOnly ? 'No provider available' : 'No signer available');
      }

      const contracts = getContracts(chainId);
      const contractAddress = contracts.INTELLIGENCE_LEDGER;

      if (!contractAddress) {
        throw new Error('IntelligenceLedger contract address not configured for this network');
      }

      return new ethers.Contract(contractAddress, IntelligenceLedgerABI.abi, signerOrProvider);
    };

    // Claim payout from a resolved prediction
    const claimPayout = async (predictionId) => {
      if (!signer) {
        throw new Error('No signer available');
      }

      try {
        const payoutContract = getSettlementEngineContract(false);
        const tx = await payoutContract.claimPayout(predictionId);
        await tx.wait();
        return tx;
      } catch (error) {
        console.error('Error claiming payout:', error);
        throw error;
      }
    };

    // Request payout (step 1 of 3-step flow: triggers FHE decryption)
    const requestPayout = async (predictionId) => {
      if (!signer) {
        throw new Error('No signer available');
      }

      try {
        const payoutContract = getSettlementEngineContract(false);
        const tx = await payoutContract.requestPayout(predictionId);
        await tx.wait();
        return tx;
      } catch (error) {
        console.error('Error requesting payout:', error);
        throw error;
      }
    };

    // Get payout status for a bet
    const getPayoutStatus = async (betId, userAddress) => {
      try {
        // Force fresh provider to avoid stale state
        if (!provider) {
          throw new Error('No provider available');
        }

        // Get fresh network state
        const blockNumber = await provider.getBlockNumber();
        console.log('🔍 Current block number:', blockNumber);

        const payoutContract = getSettlementEngineContract(true);
        console.log('🔍 Calling getPayoutStatus on contract:', payoutContract.target, 'betId:', betId, 'user:', userAddress);
        const status = await payoutContract.getPayoutStatus(betId, userAddress);
        console.log('🔍 Raw contract response:', status);
        const result = {
          hasRequested: status[0],
          isProcessed: status[1],
          payoutAmount: status[2]
        };
        console.log('🔍 Transformed result:', result);
        return result;
      } catch (error) {
        console.error('Error getting payout status:', error);
        throw error;
      }
    };

  /* Check if on correct network */
  const isOnLocal = chainId === LOCAL_CHAIN_ID;
  const isOnSepolia = chainId === SEPOLIA_CHAIN_ID;
  const networkInfo = getNetworkConfig(chainId);

  const value = {
    account,
    provider,
    signer,
    isConnected,
    isConnecting,
    isInitializing,
    chainId,
    currentNetwork,
    networkInfo,
    isOnLocal,
    isOnSepolia,
    connect,
    disconnect,
    switchToLocal,
    switchToSepolia,
    switchNetwork,
    detectCurrentNetwork,
    signMessage,
    getContract,
    getPredictionHubContract,
    getSettlementEngineContract,
    getIntelligenceLedgerContract,
    requestPayout,
    claimPayout,
    getPayoutStatus,
    ethers,
  };

  // We removed the forced loading screen per user request.
  // We can render the Provider directly so the app shell is visible.
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};


