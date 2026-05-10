# Getting Started with Privora

Complete guide for installing, setting up, and running the Privora platform locally or in production.

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Environment Configuration](#-environment-configuration)
4. [Running the Application](#-running-the-application)
5. [Smart Contract Deployment](#-smart-contract-deployment)
6. [Verification](#-verification)

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18.x LTS or 20.x LTS | JavaScript runtime |
| **npm** | 9.x or higher | Package manager |
| **Git** | 2.30+ | Version control |
| **MongoDB** | 6.x | Database (local or Atlas) |
| **Hardhat** | 2.26+ | Smart contract development |

### Optional (for development)

| Tool | Purpose |
|------|---------|
| **Yarn** | Alternative package manager |
| **Docker** | Containerized MongoDB |
| **VS Code** | Recommended IDE with extensions |

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/charan0318/privora.git
cd privora
```

### 2. Install All Dependencies

The project uses a monorepo structure with three workspaces:

```bash
# Install root dependencies and all workspace dependencies
npm run install:all

# Or install individually:
npm run install:protocol  # Smart contracts
npm run install:backend   # Backend API
npm run install:frontend  # Frontend application
```

### 3. Verify Installation

```bash
# Check Node version
node --version  # Should be 18.x or 20.x

# Check npm version
npm --version   # Should be 9.x or higher

# List installed packages
ls -la protocol/node_modules  # Should exist
ls -la backend/node_modules     # Should exist
ls -la frontend/node_modules    # Should exist
```

---

## ⚙️ Environment Configuration

### 1. Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
# Server Configuration
PORT=5002
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/privora

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Blockchain Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your-wallet-private-key-here

# Contract Addresses (after deployment)
PREDICTION_HUB_ADDRESS=0x...
SETTLEMENT_ENGINE_ADDRESS=0x...
INTELLIGENCE_LEDGER_ADDRESS=0x...
GOVERNANCE_CONTROLLER_ADDRESS=0x...
TOPIC_REGISTRY_ADDRESS=0x...
USDC_ADDRESS=0x18C97d762dF7Ee8Efa413B99bf2D14943E420Fc2
```

### 2. Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```bash
# FHEVM Network Configuration
VITE_FHEVM_NETWORK_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Contract Addresses (Sepolia)
VITE_PREDICTION_HUB_ADDRESS=0x9C79418985E55C9feC2dCAf5358aD41dAd49B813
VITE_SETTLEMENT_ENGINE_ADDRESS=0xfAD4889Bf30A4C28A100B990eAEaa4D096b6Cbe9
VITE_INTELLIGENCE_LEDGER_ADDRESS=0x1774204aC423F469Ef25EAB16b551d7b4fe5C831
VITE_GOVERNANCE_CONTROLLER_ADDRESS=0x780a5a98d59f6F2C2FfF2a02dab93B0f1d0C522A
VITE_TOPIC_REGISTRY_ADDRESS=0xb623B10708239e148E77451BD18410332055B33a
VITE_USDC_ADDRESS=0x18C97d762dF7Ee8Efa413B99bf2D14943E420Fc2

# Admin Addresses (comma-separated)
VITE_ADMIN_ADDRESSES=0xYourAdminWalletAddress

# Chain Configuration
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=sepolia
```

### 3. Protocol (Smart Contracts) Configuration

```bash
cd protocol
cp .env.example .env
```

Edit `protocol/.env`:

```bash
# Private key for deployment (NEVER commit this!)
PRIVATE_KEY=your-wallet-private-key-here

# Alchemy API Key
ALCHEMY_API_KEY=your-alchemy-api-key

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your-etherscan-api-key

# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

---

## ▶️ Running the Application

### Development Mode

Start all services simultaneously:

```bash
# From the root directory
npm run dev
```

This starts:
- **Backend API**: http://localhost:5002
- **Frontend**: http://localhost:5173

### Individual Services

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Production Build

```bash
# Build all components
npm run build

# Or build individually:
npm run build:contracts  # Compile Solidity contracts
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend
```

---

## 📜 Smart Contract Deployment

### Local Development

```bash
cd protocol

# Start local Hardhat node
npm run node

# In a new terminal, deploy to local network
npm run deploy:local
```

### Sepolia Testnet

```bash
cd protocol

# Deploy to Sepolia
npm run deploy:sepolia
```

### Deployment Script

The deployment script (`protocol/scripts/deployPrivora.js`) handles:

1. **Contract Deployment Order**:
   - GovernanceController
   - TopicRegistry
   - PredictionHub
   - IntelligenceLedger
   - SettlementEngine

2. **Configuration**:
   - Sets admin addresses
   - Configures contract relationships
   - Sets USDC token address

3. **Verification**:
   - Verifies contracts on Etherscan (if API key provided)

---

## ✅ Verification

### Check Backend

```bash
# Health check
curl http://localhost:5002/health

# Expected response:
# {"status":"ok","timestamp":"2024-..."}
```

### Check Frontend

1. Open http://localhost:5173 in your browser
2. Connect your MetaMask wallet
3. You should see the Privora homepage

### Check Database

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/privora

# List collections
show collections

# Expected collections:
# - predictions
# - categories
# - userpositions
```

---

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find module` | Run `npm run install:all` again |
| `MongoDB connection failed` | Ensure MongoDB is running locally or check connection string |
| `FHEVM not initialized` | Wait 2-3 seconds after connecting wallet |
| `Contract not deployed` | Run deployment script or check contract addresses |

### Getting Help

- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Open an issue on [GitHub](https://github.com/charan0318/privora/issues)
- Join our [Discussions](https://github.com/charan0318/privora/discussions)

---

## 📚 Next Steps

- [User Guide](USER_GUIDE.md) - Learn how to use the platform
- [Admin Guide](ADMIN_GUIDE.md) - Learn administrative operations
- [Technical Architecture](TECHNICAL_ARCHITECTURE.md) - Understand the system design