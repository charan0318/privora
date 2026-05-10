const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Creating test prediction on localhost...");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Using account:", deployer.address);

    // Contract addresses from deployment
    const predictionHubAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
    const usdcAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";

    // Get contract instances
    const PredictionHub = await ethers.getContractFactory("PredictionHub");
    const predictionHub = PredictionHub.attach(predictionHubAddress);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(usdcAddress);

    // Check USDC balance
    console.log("\n💰 Checking USDC balance...");
    const balance = await usdc.balanceOf(deployer.address);
    console.log(`   Current balance: ${ethers.formatUnits(balance, 6)} USDC`);
    
    // Mint USDC if needed
    if (balance < ethers.parseUnits("100", 6)) {
        console.log("   Minting USDC...");
        const mintTx = await usdc.mint(deployer.address, ethers.parseUnits("1000", 6));
        await mintTx.wait();
        console.log("   ✅ USDC minted");
    } else {
        console.log("   ✅ Sufficient USDC balance");
    }

    // Approve USDC for PredictionHub
    console.log("\n📝 Approving USDC...");
    const approveTx = await usdc.approve(predictionHubAddress, ethers.parseUnits("1000", 6));
    await approveTx.wait();
    console.log("   ✅ USDC approved");

    // Create a binary prediction (Yes/No)
    console.log("\n📦 Creating binary prediction...");
    
    const endTime = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now
    const minPosition = ethers.parseUnits("1", 6); // 1 USDC
    const maxPosition = ethers.parseUnits("100", 6); // 100 USDC
    const liquidityParam = 100; // 100 (will be multiplied by 1e6 in contract)

    const optionTitles = ["Yes", "No"];

    const createTx = await predictionHub.initializePrediction(
        2, // 2 options
        endTime,
        0, // BINARY type
        minPosition,
        maxPosition,
        liquidityParam,
        "Will Bitcoin reach $100k by end of 2025?",
        "Test prediction for development",
        optionTitles
    );

    const receipt = await createTx.wait();
    console.log("   ✅ Prediction created!");

    // Get the prediction ID from the event
    const event = receipt.logs.find(log => {
        try {
            const parsed = predictionHub.interface.parseLog(log);
            return parsed.name === "PredictionInitialized";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = predictionHub.interface.parseLog(event);
        console.log(`   📊 Prediction ID: ${parsed.args.predictionId}`);
    }

    console.log("\n✅ Test prediction created successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });