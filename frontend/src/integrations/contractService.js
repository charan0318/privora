import { ethers } from 'ethers';
import { CONTRACTS, NETWORK_CONFIG, getNetworkConfig } from '../config/contracts.js';
import { encryptBetAmount, encryptBetData, initializeFHE } from '../lib/fhe.js';

// Import contract ABIs - Updated to use new contract names
import PredictionHubContract from "@artifacts/PredictionHub.sol/PredictionHub.json";
const PredictionHubABI = PredictionHubContract.abi;
import SettlementEngineContract from "@artifacts/SettlementEngine.sol/SettlementEngine.json";
const SettlementEngineABI = SettlementEngineContract.abi;
import IntelligenceLedgerContract from "@artifacts/IntelligenceLedger.sol/IntelligenceLedger.json";
const IntelligenceLedgerABI = IntelligenceLedgerContract.abi;
import TopicRegistryABI from '@artifacts/TopicRegistry.sol/TopicRegistry.json';
import GovernanceControllerABI from '@artifacts/GovernanceController.sol/GovernanceController.json';
import MockERC20ABI from '@artifacts/MockERC20.sol/MockERC20.json';

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
    this.readOnlyProvider = null;
    this.readOnlyContracts = {};
    this.isReadOnlyInitialized = false;

    // Simple cache to reduce API calls
    this.cache = new Map();
    this.cacheTimeout = 10000; // 10 seconds cache
  }

  // Simple cache helper
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(keyPattern = null) {
    if (keyPattern) {
      // Clear specific cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  async initializeReadOnly(chainId = null, contractAddresses = null) {
    try {
      console.log('🔗 Initializing Read-Only Contract Service...');

      // Determine network and get correct contracts
      const chainIdNum = chainId ? (typeof chainId === 'string' ? parseInt(chainId, 16) : chainId) : 11155111;
      
      // Get network config based on chain ID
      const networkConfig = getNetworkConfig(chainIdNum);
      const contracts = contractAddresses || networkConfig.contracts;

      // Determine RPC URL based on chain ID
      let rpcUrl;
      if (chainIdNum === 31337) {
        rpcUrl = 'http://127.0.0.1:8545'; // Local hardhat
      } else {
        rpcUrl = import.meta.env.VITE_FHEVM_NETWORK_URL || 'https://eth-sepolia.g.alchemy.com/v2/9fXp7fm_MDLQSkhi_x4PQ'; // Sepolia
      }

      console.log(`📡 Using RPC URL: ${rpcUrl}`);
      console.log(`📋 Using contracts:`, contracts);

      // Create read-only provider
      this.readOnlyProvider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize read-only contract instances
      this.readOnlyContracts = {
        predictionHub: new ethers.Contract(contracts.PREDICTION_HUB, PredictionHubABI, this.readOnlyProvider),
        settlementEngine: new ethers.Contract(contracts.SETTLEMENT_ENGINE, SettlementEngineABI, this.readOnlyProvider),
        intelligenceLedger: new ethers.Contract(contracts.INTELLIGENCE_LEDGER, IntelligenceLedgerABI, this.readOnlyProvider),
        topicRegistry: new ethers.Contract(contracts.TOPIC_REGISTRY, TopicRegistryABI.abi, this.readOnlyProvider),
        governanceController: new ethers.Contract(contracts.GOVERNANCE_CONTROLLER, GovernanceControllerABI.abi, this.readOnlyProvider),
        privoraToken: new ethers.Contract(contracts.USDC_TOKEN || contracts.PRIVORA_TOKEN, MockERC20ABI.abi, this.readOnlyProvider)
      };

      this.isReadOnlyInitialized = true;
      console.log('✅ Read-Only Contract Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Read-Only Contract Service initialization failed:', error);
      throw error;
    }
  }

  async initialize(provider, signer) {
    try {
      console.log('🔗 Initializing Contract Service...');

      // Clean up any existing state
      if (this.isInitialized) {
        this.removeAllListeners();
        this.isInitialized = false;
      }

      this.provider = provider;
      this.signer = signer;

      // Check network with retry mechanism
      let network;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          network = await provider.getNetwork();
          break;
        } catch (networkError) {
          console.warn(`Network check attempt ${retryCount + 1} failed:`, networkError.message);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to get network after ${maxRetries} attempts: ${networkError.message}`);
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Get network config based on detected chain ID
      const networkConfig = getNetworkConfig(network.chainId);
      console.log(`🌐 Detected network: ${networkConfig.name} (chainId: ${network.chainId})`);

      // Initialize contract instances with correct addresses for the network
      this.contracts = {
        predictionHub: new ethers.Contract(networkConfig.contracts.PREDICTION_HUB, PredictionHubABI, signer),
        settlementEngine: new ethers.Contract(networkConfig.contracts.SETTLEMENT_ENGINE, SettlementEngineABI, signer),
        intelligenceLedger: new ethers.Contract(networkConfig.contracts.INTELLIGENCE_LEDGER, IntelligenceLedgerABI, signer),
        topicRegistry: new ethers.Contract(networkConfig.contracts.TOPIC_REGISTRY, TopicRegistryABI.abi, signer),
        governanceController: new ethers.Contract(networkConfig.contracts.GOVERNANCE_CONTROLLER, GovernanceControllerABI.abi, signer),
        privoraToken: new ethers.Contract(networkConfig.contracts.USDC_TOKEN || networkConfig.contracts.PRIVORA_TOKEN, MockERC20ABI.abi, signer)
      };

      this.isInitialized = true;
      console.log('✅ Contract Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Contract Service initialization failed:', error);
      throw error;
    }
  }

  // ==== INTELLIGENCE FUNCTIONS ====

  async submitAllocation(signalId, optionIndex, betAmount, userAddress) {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      console.log('🎯 Submitting encrypted allocation with FHEVM...');
      console.log('Signal ID:', signalId);
      console.log('Option Index:', optionIndex);
      console.log('Bet Amount (USDC):', betAmount);
      console.log('User Address:', userAddress);

      // Initialize FHEVM if not already done
      await initializeFHE();

      // Validation - option index check (will be encrypted)
      if (optionIndex < 0 || optionIndex > 255) {
        throw new Error(`Invalid option index ${optionIndex}. Must be between 0-255 for euint8.`);
      }
      console.log('✅ Basic validation passed - proceeding with FHEVM encryption');

      // Convert bet amount to USDC units (6 decimals)
      const betAmountInUSDCUnits = Math.floor(betAmount * 1000000); // Convert to 6 decimal USDC

      console.log('💰 Bet amount in USDC units:', betAmountInUSDCUnits);
      console.log('🎯 Option index to encrypt:', optionIndex);

      // Encrypt BOTH option index AND bet amount using combined encryption
      console.log('🔐 Encrypting option index and bet amount with FHEVM...');
      const contractAddress = CONTRACTS.PREDICTION_HUB;

      // Use combined encryption from useFHEVM hook approach
      const { encryptedOptionIndex, encryptedAmount, inputProof } = await encryptBetData(optionIndex, betAmountInUSDCUnits, contractAddress, userAddress);

      console.log('✅ Combined encryption completed:', {
        encryptedOptionIndex: encryptedOptionIndex?.substring(0, 20) + '...',
        encryptedAmount: encryptedAmount?.substring(0, 20) + '...',
        inputProof: inputProof?.substring(0, 20) + '...'
      });

      // First approve USDC transfer
      console.log('💳 Approving USDC transfer...');
      const approvalTx = await this.contracts.privoraToken.approve(
        CONTRACTS.PREDICTION_HUB,
        betAmountInUSDCUnits
      );
      console.log('📤 Approval transaction sent:', approvalTx.hash);
      await approvalTx.wait();
      console.log('✅ USDC approval completed');

      // Call contract with combined encrypted data - submitAllocation for PredictionHub
      console.log('📡 Calling contract submitAllocation with encrypted option and amount...');
      const tx = await this.contracts.predictionHub.submitAllocation(
        BigInt(signalId),   // uint256 _signalId
        encryptedOptionIndex,   // externalEuint8 _encryptedOptionIndex
        inputProof,             // bytes calldata _optionProof
        encryptedAmount,        // externalEuint64 _encryptedAmount
        inputProof              // bytes calldata _amountProof
      );

      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Position submitted successfully with FHEVM encryption');

      // Clear cache for this signal to ensure fresh data on next fetch
      this.clearCache(`signal_${signalId}`);

      // Store user allocation data for profile display
      this.storeUserBet(userAddress, {
        betId: signalId,
        optionIndex,
        shares: 1, // Demo value
        actualAmount: betAmount // Store the real allocation amount
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        receipt
      };
    } catch (error) {
      console.error('❌ Failed to submit position with FHEVM:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });
      throw error;
    }
  }

  async requestPayout(signalId, gasValue = '0.02') {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      console.log('💰 Requesting payout for signal:', signalId);

      // Use SettlementEngine for requesting payout (triggers FHE decryption)
      const tx = await this.contracts.settlementEngine.requestPayout(signalId, {
        value: ethers.parseEther(gasValue) // Gas fee for decryption
      });

      console.log('📤 Payout request transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Payout request submitted successfully');

      return {
        success: true,
        txHash: receipt.transactionHash,
        receipt
      };
    } catch (error) {
      console.error('❌ Failed to request payout:', error);
      throw error;
    }
  }

  async claimWinnings(signalId) {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      console.log('💰 Claiming winnings for signal:', signalId);

      // Use SettlementEngine for claiming winnings (step 2 after decryption)
      const tx = await this.contracts.settlementEngine.claimPayout(signalId);

      console.log('📤 Claim transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Winnings claimed successfully');

      return {
        success: true,
        txHash: receipt.transactionHash,
        receipt
      };
    } catch (error) {
      console.error('❌ Failed to claim winnings:', error);
      throw error;
    }
  }

  // ==== SIGNAL MANAGEMENT ====

  async initializeSignal(signalData) {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      console.log('📝 Initializing new signal...');

      const tx = await this.contracts.predictionHub.initializeSignal(
        signalData.optionCount,
        Math.floor(new Date(signalData.endTime).getTime() / 1000),
        signalData.signalType || 0, // BINARY = 0
        signalData.minAllocationAmount || 1,
        signalData.maxAllocationAmount || 10000,
        signalData.liquidityParam || 100,
        signalData.title,
        signalData.description || '',
        signalData.optionTitles
      );

      console.log('📤 Initialize prediction transaction sent:', tx.hash);
      const receipt = await tx.wait();

      // Get signal ID from events
      const event = receipt.logs.find(log =>
        log.topics[0] === ethers.id('SignalInitialized(uint256,uint256,uint256)')
      );

      const predictionId = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], event.topics[1])[0];

      console.log('✅ Signal initialized successfully with ID:', signalId.toString());

      return {
        success: true,
        signalId: signalId.toString(),
        txHash: receipt.transactionHash,
        receipt
      };
    } catch (error) {
      console.error('❌ Failed to initialize prediction:', error);
      throw error;
    }
  }

  async finalizeSignalOutcome(signalId, winnerIndex) {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      console.log('🎲 Finalizing outcome for signal:', signalId, 'Winner:', winnerIndex);

      const tx = await this.contracts.predictionHub.finalizeSignalOutcome(signalId, winnerIndex);
      console.log('📤 Finalize transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Outcome finalized successfully');

      return {
        success: true,
        txHash: receipt.transactionHash,
        receipt
      };
    } catch (error) {
      console.error('❌ Failed to finalize outcome:', error);
      throw error;
    }
  }

  // ==== VIEW FUNCTIONS ====

  async getSignal(signalId) {
    try {
      // Skip cache for clean data
      const cacheKey = `signal_${signalId}`;

      let predictionHubContract;

      // Try read-only first, then fallback to regular contracts
      if (this.isReadOnlyInitialized) {
        predictionHubContract = this.readOnlyContracts.predictionHub;
      } else if (this.isInitialized) {
        predictionHubContract = this.contracts.predictionHub;
      } else {
        // Initialize read-only if not available
        await this.initializeReadOnly();
        predictionHubContract = this.readOnlyContracts.predictionHub;
      }

      // Get basic signal data
      const signal = await predictionHubContract.signals(signalId);

      // Get options data
      const options = [];
      for (let i = 0; i < Number(signal.optionCount); i++) {
        try {
          const option = await predictionHubContract.getResearchOption(signalId, i);
          options.push({
            title: option.title,
            totalShares: Number(option.publicTotalShares),
            isWinner: option.isWinner,
            yesPrice: 50 // Default price for demo
          });
        } catch (optionError) {
          console.error(`Failed to fetch option ${i} for signal ${signalId}:`, optionError);
          // Skip failed options - no fallback
        }
      }

      const formatted = {
        ...this.formatPredictionData(signal, signalId),
        options
      };

      this.setCached(cacheKey, formatted);
      return formatted;
    } catch (error) {
      console.error('❌ Failed to get signal:', error);
      throw error; // No fallback - fail clearly
    }
  }

  async getActiveBets() {
    try {
      // Use database-first approach for hybrid system
      const response = await fetch('/api/bets');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      // Handle the API response structure: {success: true, data: {bets: []}}
      if (result.success && result.data && result.data.bets) {
        console.log('✅ Fetched', result.data.bets.length, 'bets from database');
        return result.data.bets;
      } else {
        console.log('⚠️ API returned no bets or invalid structure:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get active bets from database:', error);
      // No contract fallback for FHEVM - database is primary
      return [];
    }
  }

  async getAllSignals() {
    try {
      // Try to get all signals from contract - iterate through signal IDs
      let predictionHubContract;

      // Try read-only first, then fallback to regular contracts
      if (this.isReadOnlyInitialized) {
        predictionHubContract = this.readOnlyContracts.predictionHub;
      } else if (this.isInitialized) {
        predictionHubContract = this.contracts.predictionHub;
      } else {
        // Initialize read-only if not available
        await this.initializeReadOnly();
        predictionHubContract = this.readOnlyContracts.predictionHub;
      }

      const allSignals = [];

      // Try to get signals by iterating through IDs (start from 1, most contracts start from 1)
      let signalId = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3; // Stop after 3 consecutive failures

      while (consecutiveFailures < maxConsecutiveFailures && signalId <= 100) { // Reasonable upper limit
        try {
          console.log(`🔍 Fetching signal ${signalId}...`);
          console.log(`📋 Contract address: ${predictionHubContract.target}`);

          // Provider debug info
          if (this.readOnlyProvider) {
            console.log(`📡 Provider URL:`, this.readOnlyProvider._getConnection?.()?.url || this.readOnlyProvider.connection?.url || 'Unknown URL');
            console.log(`📡 Provider type:`, this.readOnlyProvider.constructor.name);
          } else {
            console.log(`❌ No readOnlyProvider available`);
          }

          const signal = await predictionHubContract.signals(signalId);
          console.log(`📊 Raw signal ${signalId} data:`, signal);

          // Skip if signal doesn't exist (id == 0)
          if (signal.id === 0) {
            console.log(`⏭️ Signal ${signalId} doesn't exist, skipping`);
            consecutiveFailures++;
            signalId++;
            continue;
          }

          // Get options data
          const options = [];
          for (let i = 0; i < Number(signal.optionCount); i++) {
            try {
              const option = await predictionHubContract.getResearchOption(signalId, i);
              options.push({
                title: option.title,
                totalShares: Number(option.publicTotalShares),
                isWinner: option.isWinner,
                yesPrice: 50
              });
            } catch (optionError) {
              console.warn(`Failed to fetch option ${i} for signal ${signalId}:`, optionError);
            }
          }

          const formattedSignal = {
            ...this.formatPredictionData(signal, signalId),
            options,
            status: signal.isResolved ? 'resolved' : (signal.isActive ? 'active' : 'ended')
          };

          allSignals.push(formattedSignal);
          consecutiveFailures = 0; // Reset counter on success
          console.log(`✅ Fetched signal ${signalId}: ${signal.title}`);

        } catch (error) {
          console.error(`❌ Failed to fetch prediction ${predictionId}:`, error);
          console.error(`❌ Error message:`, error.message);
          console.error(`❌ Error code:`, error.code);
          consecutiveFailures++;
        }

        signalId++;
      }

      console.log(`✅ Retrieved ${allSignals.length} signals from contract`);
      return allSignals;

    } catch (error) {
      console.error('❌ Failed to get all signals from contract:', error);

      // Fallback to database approach
      try {
        return await this.getActiveBets(); // Returns signals from DB
      } catch (fallbackError) {
        console.error('❌ Fallback to database also failed:', fallbackError);
        return [];
      }
    }
  }

  async getSignalsByCategory(categoryId) {
    try {
      // Use database-first approach for hybrid system
      const response = await fetch(`/api/signals?categoryId=${categoryId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (result.success && result.data && result.data.signals) {
        console.log('✅ Fetched', result.data.signals.length, 'signals from database');
        return result.data.signals;
      } else {
        console.log('⚠️ API returned no signals or invalid structure:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get signals by category from database:', error);
      return [];
    }
  }

  async getUserPredictions(userAddress) {
    try {
      if (!this.isInitialized) throw new Error('Contract service not initialized');

      // Check localStorage for recent prediction activity as a temporary measure
      console.log('🔄 Using fallback method to find user predictions...');
      const recentPredictions = this.getRecentUserBetsFromStorage(userAddress);

      if (recentPredictions.length > 0) {
        console.log('✅ Found recent predictions in localStorage:', recentPredictions);
        return recentPredictions;
      }

      console.log('📭 No user predictions found');
      return [];
    } catch (error) {
      console.error('❌ Failed to get user predictions:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Temporary fallback to check recent bet activity
  getRecentUserBetsFromStorage(userAddress) {
    try {
      const storageKey = `userBets_${userAddress}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const bets = JSON.parse(stored);
        // Return bets from last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return bets.filter(bet => bet.timestamp && new Date(bet.timestamp).getTime() > oneDayAgo);
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }
    return [];
  }

  // Calculate real volume for a bet from all localStorage data
  calculateRealVolumeForBet(betId) {
    try {
      let totalVolume = 0;
      let totalBets = 0;
      let uniqueTraders = new Set();

      // Get all bet data for this specific betting market
      const currentUser = window.ethereum?.selectedAddress;
      if (currentUser) {
        // Get ALL user bets (not just recent ones) for this betId
        const storageKey = `userBets_${currentUser}`;
        let allUserBets = [];

        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            allUserBets = JSON.parse(stored);
          }
        } catch (e) {
          console.warn('Failed to parse localStorage bets:', e);
        }

        // Filter bets for this specific betting market
        const userBetsForThisBet = allUserBets.filter(bet => bet.betId === betId.toString());

        // Calculate totals from all bets for this market
        userBetsForThisBet.forEach(bet => {
          const amount = bet.actualAmount || 0;
          totalVolume += amount;
          totalBets += 1;
          uniqueTraders.add(currentUser);
          console.log(`📊 Adding bet to volume: $${amount}, Total so far: $${totalVolume}`);
        });

        console.log(`📊 Final volume calculation for bet ${betId}:`, {
          totalVolume,
          totalBets,
          uniqueTraders: uniqueTraders.size,
          userBetsCount: userBetsForThisBet.length
        });
      }

      return {
        totalVolume,
        totalBets,
        uniqueTraders: uniqueTraders.size
      };
    } catch (error) {
      console.warn('Failed to calculate real volume:', error);
      return { totalVolume: 0, totalBets: 0, uniqueTraders: 0 };
    }
  }

  // Method to store user bet when a bet is placed successfully
  storeUserBet(userAddress, betData) {
    try {
      const storageKey = `userBets_${userAddress}`;
      let existingBets = [];

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          existingBets = JSON.parse(stored);
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Add new bet
      existingBets.push({
        betId: betData.betId.toString(),
        optionIndex: betData.optionIndex,
        shares: 1, // Demo value
        actualAmount: betData.actualAmount || 0, // Store real bet amount
        timestamp: new Date().toISOString(),
        claimed: false
      });

      // Keep only last 100 bets
      if (existingBets.length > 100) {
        existingBets = existingBets.slice(-100);
      }

      localStorage.setItem(storageKey, JSON.stringify(existingBets));
      console.log('💾 Stored user bet in localStorage');
    } catch (error) {
      console.warn('Failed to store user bet:', error);
    }
  }

  // ==== CATEGORY FUNCTIONS ====

  async getCategories() {
    try {
      // Categories are static data for now, no need for contract calls
      // In future this could be fetched from CategoryManager contract
      return [
        { id: 1, name: 'Politics', imageUrl: 'politics.jpg', parentId: 0 },
        { id: 2, name: 'Cryptocurrency', imageUrl: 'crypto.jpg', parentId: 0 },
        { id: 3, name: 'Sports', imageUrl: 'sports.jpg', parentId: 0 },
        { id: 4, name: 'Economics', imageUrl: 'economics.jpg', parentId: 0 },
        { id: 5, name: 'Science', imageUrl: 'science.jpg', parentId: 0 },
        { id: 6, name: 'Entertainment', imageUrl: 'entertainment.jpg', parentId: 0 },
        { id: 7, name: 'Technology', imageUrl: 'technology.jpg', parentId: 0 }
      ];
    } catch (error) {
      console.error('❌ Failed to get categories:', error);
      throw error;
    }
  }

  // ==== HELPER FUNCTIONS ====

  formatBetData(rawBet, betId) {
    // Handle both object and array format from contract
    if (Array.isArray(rawBet)) {
      // Array format from BetMarketPro contract:
      // [0] id, [1] endTime, [2] isActive, [3] isResolved, [4] winnerIndex,
      // [5] creator, [6] minBetAmount, [7] maxBetAmount, [8] optionCount,
      // [9] categoryId, [10] title, [11] description
      return {
        id: betId,
        title: rawBet[10] || `Bet #${betId}`,
        description: rawBet[11] || '',
        imageUrl: null,
        categoryId: rawBet[9] ? rawBet[9].toString() : '0',
        endTime: new Date(Number(rawBet[1]) * 1000),
        isActive: rawBet[2],
        isResolved: rawBet[3],
        createdAt: new Date(), // Not available in contract
        updatedAt: new Date(), // Not available in contract
        mustShowLive: false,
        liveStartTime: null,
        liveEndTime: null,
        betType: 0, // Default to BINARY
        optionCount: Number(rawBet[8]),
        minBetAmount: Number(rawBet[6]) || 1,
        maxBetAmount: Number(rawBet[7]) || 10000,
        createdBy: rawBet[5] || '0x0000000000000000000000000000000000000000',
        totalParticipants: 0 // Not available in basic contract
      };
    } else {
      // Object format (legacy)
      return {
        id: betId,
        title: rawBet.title,
        description: rawBet.description || '',
        imageUrl: rawBet.imageUrl,
        categoryId: rawBet.categoryId.toString(),
        endTime: new Date(Number(rawBet.endTime) * 1000),
        isActive: rawBet.isActive,
        isResolved: rawBet.isResolved,
        createdAt: new Date(Number(rawBet.createdAt) * 1000),
        updatedAt: new Date(Number(rawBet.updatedAt) * 1000),
        mustShowLive: rawBet.mustShowLive,
        liveStartTime: rawBet.liveStartTime > 0 ? new Date(Number(rawBet.liveStartTime) * 1000) : null,
        liveEndTime: rawBet.liveEndTime > 0 ? new Date(Number(rawBet.liveEndTime) * 1000) : null,
        betType: Number(rawBet.betType),
        optionCount: Number(rawBet.optionCount),
        minBetAmount: Number(rawBet.minBetAmount) || 1,
        maxBetAmount: Number(rawBet.maxBetAmount) || 10000,
        createdBy: rawBet.createdBy || '0x0000000000000000000000000000000000000000',
        totalParticipants: Number(rawBet.totalParticipants) || 0
      };
    }
  }

  // Format signal data from PredictionHub contract
  formatPredictionData(rawPrediction, predictionId) {
    // Signal struct from PredictionHub:
    // [0] id, [1] endTime, [2] isActive, [3] isResolved, [4] signalType,
    // [5] createdBy, [6] minAllocationAmount, [7] maxAllocationAmount, [8] optionCount,
    // [9] createdAt, [10] title, [11] description, [12] liquidityParam
    return {
      id: predictionId,
      title: rawPrediction.title || `Prediction #${predictionId}`,
      description: rawPrediction.description || '',
      imageUrl: null,
      categoryId: '0', // Not available in PredictionHub directly
      endTime: new Date(Number(rawPrediction.endTime) * 1000),
      isActive: rawPrediction.isActive,
      isResolved: rawPrediction.isResolved,
      createdAt: new Date(Number(rawPrediction.createdAt) * 1000),
      updatedAt: new Date(Number(rawPrediction.createdAt) * 1000),
      mustShowLive: false,
      liveStartTime: null,
      liveEndTime: null,
      betType: Number(rawPrediction.predictionType), // 0=BINARY, 1=MULTIPLE_CHOICE, 2=NESTED_CHOICE
      optionCount: Number(rawPrediction.optionCount),
      minBetAmount: Number(rawPrediction.minPositionAmount) || 1,
      maxBetAmount: Number(rawPrediction.maxPositionAmount) || 10000,
      createdBy: rawPrediction.createdBy || '0x0000000000000000000000000000000000000000',
      totalParticipants: 0, // Would need to decrypt
      liquidityParam: Number(rawPrediction.liquidityParam) || 100
    };
  }

  formatUserPredictionData(rawUserPrediction) {
    // Handle corrupted or invalid data from contract
    const predictionId = rawUserPrediction.predictionId ? rawUserPrediction.predictionId.toString() : '0';
    const optionIndex = Number(rawUserPrediction.optionIndex) || 0;
    const shares = Number(rawUserPrediction.shares) || 0;

    // Handle timestamp - if it's too large or invalid, use current time
    let timestamp;
    try {
      const timestampValue = Number(rawUserPrediction.timestamp);
      // Check if timestamp is reasonable (between 2020 and 2030)
      if (timestampValue > 1577836800 && timestampValue < 1893456000) {
        timestamp = new Date(timestampValue * 1000);
      } else {
        // Invalid timestamp, use current time
        timestamp = new Date();
      }
    } catch (error) {
      timestamp = new Date();
    }

    return {
      predictionId,
      optionIndex,
      // amount is encrypted - cannot display actual value
      shares,
      timestamp,
      claimed: Boolean(rawUserPrediction.claimed)
    };
  }

  // ==== EVENT LISTENERS ====

  onPredictionInitialized(callback) {
    if (!this.contracts.predictionHub) return;

    this.contracts.predictionHub.on('PredictionInitialized', (predictionId, endTime, optionCount) => {
      callback({
        predictionId: predictionId.toString(),
        endTime: new Date(Number(endTime) * 1000),
        optionCount: Number(optionCount)
      });
    });
  }

  onPositionSubmitted(callback) {
    if (!this.contracts.predictionHub) return;

    this.contracts.predictionHub.on('PositionSubmitted', (predictionId, user, timestamp) => {
      callback({
        predictionId: predictionId.toString(),
        user,
        timestamp: Number(timestamp)
      });
    });
  }

  onOutcomeFinalized(callback) {
    if (!this.contracts.predictionHub) return;

    this.contracts.predictionHub.on('OutcomeFinalized', (predictionId, winnerIndex) => {
      callback({
        predictionId: predictionId.toString(),
        winnerIndex: Number(winnerIndex)
      });
    });
  }

  // ==== UTILITY FUNCTIONS ====

  getContractAddress(contractName) {
    switch (contractName) {
      case 'PREDICTION_HUB':
        return CONTRACTS.PREDICTION_HUB;
      case 'SETTLEMENT_ENGINE':
        return CONTRACTS.SETTLEMENT_ENGINE;
      case 'INTELLIGENCE_LEDGER':
        return CONTRACTS.INTELLIGENCE_LEDGER;
      case 'TOPIC_REGISTRY':
        return CONTRACTS.TOPIC_REGISTRY;
      case 'GOVERNANCE_CONTROLLER':
        return CONTRACTS.GOVERNANCE_CONTROLLER;
      case 'PRIVORA_TOKEN':
        return CONTRACTS.PRIVORA_TOKEN;
      default:
        throw new Error(`Unknown contract: ${contractName}`);
    }
  }

  // ==== CLEANUP ====

  cleanup() {
    this.removeAllListeners();
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  removeAllListeners() {
    try {
      if (this.contracts && this.contracts.predictionHub) {
        this.contracts.predictionHub.removeAllListeners();
      }
      if (this.contracts && this.contracts.settlementEngine) {
        this.contracts.settlementEngine.removeAllListeners();
      }
    } catch (error) {
      console.warn('Error removing listeners:', error);
    }
  }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;

