// Dynamic Network Configurations
export const NETWORK_CONFIGS = {
    localhost: {
        chainId: 31337,
        name: "Localhost",
        rpcUrl: "http://127.0.0.1:8545",
        blockExplorerUrl: null,
        contracts: {
            GOVERNANCE_CONTROLLER: "0x19cEcCd6942ad38562Ee10bAfd44776ceB67e923",
            TOPIC_REGISTRY: "0xD42912755319665397FF090fBB63B1a31aE87Cee",
            PREDICTION_HUB: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            SETTLEMENT_ENGINE: "0x5FbDB2315678afecb367f032d93F642f64180aa4",
            INTELLIGENCE_LEDGER: "0x5FbDB2315678afecb367f032d93F642f64180aa5",
            USDC_TOKEN: "0x18C97d762dF7Ee8Efa413B99bf2D14943E420Fc2"
        }
    },
    sepolia: {
        chainId: 11155111,
        name: "Sepolia",
        rpcUrl: import.meta.env.VITE_FHEVM_NETWORK_URL,
        blockExplorerUrl: "https://sepolia.etherscan.io",
        contracts: {
            GOVERNANCE_CONTROLLER: "0x780a5a98d59f6F2C2FfF2a02dab93B0f1d0C522A",
            TOPIC_REGISTRY: "0xb623B10708239e148E77451BD18410332055B33a",
            PREDICTION_HUB: "0x9C79418985E55C9feC2dCAf5358aD41dAd49B813",
            SETTLEMENT_ENGINE: "0xfAD4889Bf30A4C28A100B990eAEaa4D096b6Cbe9",
            INTELLIGENCE_LEDGER: "0x1774204aC423F469Ef25EAB16b551d7b4fe5C831",
            USDC_TOKEN: "0x18C97d762dF7Ee8Efa413B99bf2D14943E420Fc2"
        }
    }
};

// Function to get network config by chainId
export const getNetworkConfig = (chainId) => {
    const chainIdNum = typeof chainId === "string" ? parseInt(chainId, 16) : chainId;

    if (chainIdNum === 31337) return NETWORK_CONFIGS.localhost;
    if (chainIdNum === 11155111) return NETWORK_CONFIGS.sepolia;

    // Default to localhost
    return NETWORK_CONFIGS.localhost;
};

// Dynamic contracts based on current network
export const getContracts = (chainId) => {
    return getNetworkConfig(chainId).contracts;
};

// Legacy exports for backward compatibility (sepolia default for deployed contracts)
export const CONTRACTS = NETWORK_CONFIGS.sepolia.contracts;
export const NETWORK_CONFIG = NETWORK_CONFIGS.sepolia;

// FHEVM Configuration - Dynamic per network
export const getFHEVMConfig = (chainId) => {
    const networkConfig = getNetworkConfig(chainId);

    if (networkConfig.chainId === 31337) {
        // Local Hardhat FHEVM config - remote services, local contract addresses
        return {
            gatewayUrl: "https://gateway.sepolia.zama.ai/", // Remote gateway for encryption
            relayerUrl: "https://relayer.testnet.zama.cloud", // Remote relayer
            aclAddress: "0x50157cffd6bbfa2dece204a89ec419c23ef5755d", // Local Hardhat ACL
            acoAddress: "0x1364cbbf2cdf5032c47d8226a6f6fbd2afcdacac", // Local Hardhat KMS
            inputVerifierAddress: "0x901f8942346f7ab3a01f6d7613119bca447bb030", // Local Hardhat Coprocessor
            decryptionVerifierAddress: "0x36772142b74871f255cbd7a3e89b401d3e45825f", // Local Hardhat Decryption Verifier
            chainId: networkConfig.chainId
        };
    } else {
        // Sepolia FHEVM config
        return {
            gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "https://gateway.sepolia.zama.ai/",
            relayerUrl: import.meta.env.VITE_RELAYER_URL || "https://relayer.testnet.zama.cloud",
            aclAddress: import.meta.env.VITE_ACL_ADDRESS || "0x687820221192C5B662b25367F70076A37bc79b6c",
            acoAddress: import.meta.env.VITE_KMS_ADDRESS || "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
            inputVerifierAddress: import.meta.env.VITE_INPUT_VERIFIER_ADDRESS || "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
            decryptionVerifierAddress: import.meta.env.VITE_DECRYPTION_VERIFIER_ADDRESS || "0x36772142b74871f255cbd7a3e89b401d3e45825f",
            chainId: networkConfig.chainId
        };
    }
};

// Legacy export
export const FHEVM_CONFIG = getFHEVMConfig(31337);

// Contract ABIs will be imported here
export const ABIS = {
    // We'll add these after generating the ABIs
};

