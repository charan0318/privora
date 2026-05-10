const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Privora Protocol to Sepolia...");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    // 1. Use existing USDC on Sepolia
    const usdcAddress = "0x18C97d762dF7Ee8Efa413B99bf2D14943E420Fc2";
    console.log("\n📦 [1/6] Using existing USDC Token:", usdcAddress);

    // 2. Deploy GovernanceController
    console.log("\n📦 [2/6] Deploying GovernanceController...");
    const GovernanceController = await ethers.getContractFactory("GovernanceController");
    const governance = await GovernanceController.deploy();
    await governance.waitForDeployment();
    const governanceAddress = await governance.getAddress();
    console.log("   ✅ GovernanceController deployed:", governanceAddress);

    // 3. Deploy TopicRegistry
    console.log("\n📦 [3/6] Deploying TopicRegistry...");
    const TopicRegistry = await ethers.getContractFactory("TopicRegistry");
    const topicRegistry = await TopicRegistry.deploy(governanceAddress);
    await topicRegistry.waitForDeployment();
    const topicRegistryAddress = await topicRegistry.getAddress();
    console.log("   ✅ TopicRegistry deployed:", topicRegistryAddress);

    // 4. Deploy PredictionHub
    console.log("\n📦 [4/6] Deploying PredictionHub...");
    const PredictionHub = await ethers.getContractFactory("PredictionHub");
    const predictionHub = await PredictionHub.deploy(usdcAddress);
    await predictionHub.waitForDeployment();
    const predictionHubAddress = await predictionHub.getAddress();
    console.log("   ✅ PredictionHub deployed:", predictionHubAddress);

    // 5. Deploy IntelligenceLedger
    console.log("\n📦 [5/6] Deploying IntelligenceLedger...");
    const IntelligenceLedger = await ethers.getContractFactory("IntelligenceLedger");
    const intelligenceLedger = await IntelligenceLedger.deploy(predictionHubAddress);
    await intelligenceLedger.waitForDeployment();
    const intelligenceLedgerAddress = await intelligenceLedger.getAddress();
    console.log("   ✅ IntelligenceLedger deployed:", intelligenceLedgerAddress);

    // 6. Deploy SettlementEngine
    console.log("\n📦 [6/6] Deploying SettlementEngine...");
    const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
    const settlementEngine = await SettlementEngine.deploy(predictionHubAddress);
    await settlementEngine.waitForDeployment();
    const settlementEngineAddress = await settlementEngine.getAddress();
    console.log("   ✅ SettlementEngine deployed:", settlementEngineAddress);

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📝 Contract Addresses:");
    console.log("   USDC (Sepolia):        ", usdcAddress);
    console.log("   GovernanceController:  ", governanceAddress);
    console.log("   TopicRegistry:         ", topicRegistryAddress);
    console.log("   PredictionHub:         ", predictionHubAddress);
    console.log("   IntelligenceLedger:    ", intelligenceLedgerAddress);
    console.log("   SettlementEngine:      ", settlementEngineAddress);
    console.log("=".repeat(60));

    // Update .env file with deployed addresses
    const fs = require('fs');
    const envPath = __dirname + '/../.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace(/BET_MARKET_ADDRESS=.*/g, `BET_MARKET_ADDRESS=${predictionHubAddress}`);
    envContent = envContent.replace(/ADMIN_MANAGER_ADDRESS=.*/g, `ADMIN_MANAGER_ADDRESS=${governanceAddress}`);
    envContent = envContent.replace(/CATEGORY_MANAGER_ADDRESS=.*/g, `CATEGORY_MANAGER_ADDRESS=${topicRegistryAddress}`);
    envContent = envContent.replace(/USDC_TOKEN_ADDRESS=.*/g, `USDC_TOKEN_ADDRESS=${usdcAddress}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log("\n📝 Updated .env file with deployed addresses");

    return {
        usdc: usdcAddress,
        governance: governanceAddress,
        topicRegistry: topicRegistryAddress,
        predictionHub: predictionHubAddress,
        intelligenceLedger: intelligenceLedgerAddress,
        settlementEngine: settlementEngineAddress
    };
}

main()
    .then((addresses) => {
        console.log("\n💾 Save these addresses:");
        console.log(JSON.stringify(addresses, null, 2));
        process.exitCode = 0;
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exitCode = 1;
    });