# Technical Architecture

**Privora - Confidential Prediction Infrastructure**

System design and architecture overview for the Privora platform.

---

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Architecture Layers](#-architecture-layers)
3. [Data Flow](#-data-flow)
4. [Smart Contracts](#-smart-contracts)
5. [Frontend Architecture](#-frontend-architecture)
6. [Backend Architecture](#-backend-architecture)
7. [Security Model](#-security-model)
8. [Deployment Architecture](#-deployment-architecture)

---

## 🌐 System Overview

Privora implements a **privacy-first intelligence infrastructure** using **Zama's FHEVM** for confidential research operations while maintaining verifiable accuracy outcomes.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRIVORA ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Frontend  │    │   Backend   │    │  Protocol   │         │
│  │   (React)   │◄──►│   (Node.js) │◄──►│ (Solidity)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Browser   │    │   MongoDB   │    │   Zama      │         │
│  │  (fhevmjs)  │    │   Atlas     │    │  FHEVM      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Layers

### 1. Intelligence Terminal (Frontend)

**Technology Stack:**
- React 18 with Vite bundler
- TailwindCSS for styling
- fhevmjs for client-side encryption
- Ethers.js for blockchain interaction

**Key Components:**
- Signal browsing and creation interface
- Encrypted allocation management
- Real-time analytics dashboard
- Institutional wallet integration

**Directory Structure:**
```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Application pages
├── services/       # API and blockchain services
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries (fhevmjs)
├── views/          # Page-level components
└── utils/          # Helper functions
```

### 2. Intelligence API (Backend)

**Technology Stack:**
- Node.js with Express
- MongoDB for metadata storage
- Redis for caching (optional)

**Responsibilities:**
- Signal metadata management
- Analytics aggregation
- User position tracking
- Oracle coordination
- Relayer callback handling

**Directory Structure:**
```
backend/src/
├── controllers/    # Route controllers
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Business logic
├── middleware/     # Auth and validation
└── utils/          # Helper functions
```

### 3. Intelligence Contracts (Blockchain)

**Technology Stack:**
- Solidity 0.8.27
- Hardhat for development
- Zama FHEVM for encryption

**Core Contracts:**
- `PredictionHub.sol` - Signal management and encrypted operations
- `SettlementEngine.sol` - Accuracy resolution and payouts
- `IntelligenceLedger.sol` - Analytics and reputation tracking
- `GovernanceController.sol` - Administrative controls
- `TopicRegistry.sol` - Category management

---

## 🔄 Data Flow

### Signal Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin creates signal via Admin Panel                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Frontend sends transaction to PredictionHub             │
│     - Title, description, options, end time                 │
│     - Liquidity amount (unencrypted)                          │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Contract emits SignalCreated event                        │
│     - Signal ID, creator, timestamp                         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Backend syncs signal to MongoDB                         │
│     - Stores metadata for fast querying                     │
│     - Assigns category if specified                         │
└─────────────────────────────────────────────────────────────┘
```

### Signal Submission Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User selects signal and enters allocation               │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. fhevmjs encrypts allocation amount                      │
│     - Generates encryption key pair                         │
│     - Creates encrypted input with proof                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Encrypted transaction sent to PredictionHub           │
│     - Encrypted amount (euint64)                             │
│     - Encrypted option index (euint8)                         │
│     - Zero-knowledge proof                                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Contract validates and stores encrypted values          │
│     - Updates encrypted pool totals                           │
│     - Updates encrypted user balance                          │
│     - Emits PositionSubmitted event                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Frontend caches transaction locally                     │
│     - Updates UI optimistically                               │
│     - Stores in localStorage for history                      │
└─────────────────────────────────────────────────────────────┘
```

### Signal Resolution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin resolves signal via Admin Panel                     │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SettlementEngine marks winning option                   │
│     - Updates isResolved flag                                 │
│     - Stores winning option index                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Backend calculates winners/losers                       │
│     - Compares user positions to winning option             │
│     - Updates MongoDB with isWinner flag                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. User requests payout                                    │
│     - Triggers relayer callback                               │
│     - Relayer decrypts user positions                         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Relayer calculates and submits payout                   │
│     - Uses parimutuel formula                                 │
│     - Stores payout amount on-chain                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  6. User claims payout                                      │
│     - Transfers USDC from contract to wallet                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

### Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GovernanceController                     │
│  - Admin management                                         │
│  - Contract configuration                                   │
│  - Pausing/unpausing                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      TopicRegistry                            │
│  - Category CRUD operations                                 │
│  - Category ordering                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PredictionHub                              │
│  - Signal creation                                          │
│  - Encrypted position submission                            │
│  - Encrypted balance management                             │
│  - Encrypted pool totals                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SettlementEngine                           │
│  - Signal resolution                                        │
│  - Payout calculation (via relayer)                         │
│  - Payout claiming                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    IntelligenceLedger                         │
│  - Analytics aggregation                                      │
│  - Reputation tracking                                        │
│  - Statistics decryption                                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Contract Functions

#### PredictionHub.sol

| Function | Description | Access |
|----------|-------------|--------|
| `createPrediction()` | Create new prediction signal | Public |
| `submitPosition()` | Submit encrypted position | Public |
| `deposit()` | Deposit USDC to encrypted balance | Public |
| `withdraw()` | Withdraw from encrypted balance | Public |
| `getEncryptedBalance()` | Get user's encrypted balance | Public |
| `getTotalPool()` | Get encrypted total pool | Public |

#### SettlementEngine.sol

| Function | Description | Access |
|----------|-------------|--------|
| `resolvePrediction()` | Resolve signal with winner | Admin |
| `requestPayout()` | Request payout calculation | Winner |
| `claimPayout()` | Claim calculated payout | Winner |
| `fulfillPayout()` | Relayer submits payout amount | Relayer |

#### IntelligenceLedger.sol

| Function | Description | Access |
|----------|-------------|--------|
| `recordPosition()` | Record position for analytics | Internal |
| `getStatistics()` | Get platform statistics | Public |
| `getUserStats()` | Get user statistics | Public |

---

## 🖥️ Frontend Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── WalletConnect
│   │   ├── NetworkSelector
│   │   └── Navigation
│   └── Footer
├── Pages
│   ├── Home
│   │   ├── FilterTabs
│   │   ├── CategoryTabs
│   │   ├── SearchBar
│   │   └── BetGrid
│   │       └── BetCard
│   ├── Dashboard
│   │   ├── StatsCards
│   │   └── PositionTabs
│   │       ├── ActiveSignals
│   │       ├── EndedSignals
│   │       └── Claims
│   ├── Admin
│   │   ├── AdminTabs
│   │   ├── BetManagement
│   │   ├── CategoryManagement
│   │   ├── UserManagement
│   │   └── Analytics
│   └── BetDetail
│       ├── PositionForm
│       ├── PositionTabs
│       │   ├── MyPositions
│       │   └── OrderHistory
│       └── PayoutSection
└── Providers
    ├── WalletProvider
    ├── FHEVMProvider
    └── NotificationProvider
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    React Context / Zustand                    │
├─────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Wallet State    │  │ FHEVM State     │  │ UI State        │  │
│  │ - address       │  │ - instance      │  │ - theme         │  │
│  │ - balance       │  │ - publicKey     │  │ - modals        │  │
│  │ - chainId       │  │ - isInitialized │  │ - notifications │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Cache State     │  │ Form State      │  │ Admin State     │  │
│  │ - transactions  │  │ - inputs        │  │ - permissions   │  │
│  │ - positions     │  │ - validation    │  │ - settings      │  │
│  │ - bookmarks     │  │ - errors        │  │ - analytics     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Backend Architecture

### API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│                        REST API                             │
├─────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/predictions                                               │
│    GET    /              - List all predictions                │
│    GET    /:id           - Get prediction by ID                  │
│    POST   /              - Create prediction (admin)            │
│    PUT    /:id           - Update prediction (admin)            │
│    DELETE /:id           - Delete prediction (admin)            │
│                                                                  │
│  /api/categories                                                │
│    GET    /              - List all categories                  │
│    POST   /              - Create category (admin)              │
│    PUT    /:id           - Update category (admin)              │
│    DELETE /:id           - Delete category (admin)              │
│                                                                  │
│  /api/user-positions                                             │
│    GET    /:user/:prediction - Get user position               │
│    POST   /sync            - Sync positions from blockchain    │
│                                                                  │
│  /api/callback                                                    │
│    POST   /relayer         - Relayer callback endpoint           │
│                                                                  │
│  /api/analytics                                                   │
│    GET    /stats           - Get platform statistics             │
│    GET    /top-performers  - Get top researchers                │
│                                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Prediction Collection

```javascript
{
  _id: ObjectId("..."),
  predictionId: Number,        // On-chain ID
  title: String,
  description: String,
  options: [String],
  optionCount: Number,
  predictionType: Number,      // 0=Binary, 1=Multiple, 2=Nested
  endTime: Date,
  minPositionAmount: Number,
  maxPositionAmount: Number,
  liquidity: Number,
  isResolved: Boolean,
  winningOption: Number,
  winningOutcome: Number,      // For nested predictions
  categoryId: ObjectId,
  imageUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Category Collection

```javascript
{
  _id: ObjectId("..."),
  name: String,
  icon: String,                // Emoji
  color: String,               // Hex color
  displayOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### UserPosition Collection

```javascript
{
  _id: ObjectId("..."),
  userAddress: String,
  predictionId: Number,
  optionIndex: Number,
  outcome: Number,             // For nested predictions
  amount: Number,              // Decrypted for tracking
  isWinner: Boolean,
  hasClaimed: Boolean,
  transactionHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Security Model

### Privacy Guarantees

- **Encrypted Allocations**: All user allocations are encrypted using FHEVM (`euint64`)
- **Encrypted Positions**: Which option a user chose remains encrypted until resolution
- **Encrypted Balances**: User wallet balances within the contract are encrypted
- **Encrypted Pool Totals**: Total amounts per option are encrypted during betting

### Verifiability

- **On-chain Operations**: All operations recorded on-chain
- **Decryption Requests**: Public events when decryption is requested
- **Outcome Verification**: Transparent resolution process
- **Accuracy Calculations**: Auditable via blockchain data

### Access Control

| Role | Permissions |
|------|-------------|
| **User** | Submit positions, request payouts, claim rewards |
| **Admin** | Create signals, resolve signals, manage categories |
| **Super Admin** | Full access including system settings |
| **Relayer** | Submit decrypted payout amounts |

---

## 🚀 Deployment Architecture

### Development

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                        │
├─────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Hardhat     │    │ MongoDB     │    │ Vite Dev    │         │
│  │ Node        │    │ (local)     │    │ Server      │         │
│  │ (8545)      │    │ (27017)     │    │ (5173)      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Production

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Deployment                    │
├─────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Sepolia     │    │ MongoDB     │    │ Vercel/Netlify│         │
│  │ Testnet     │    │ Atlas       │    │ (Static)    │         │
│  │             │    │             │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              Backend (Render/Railway)                │     │
│  │              - Node.js server                        │     │
│  │              - API endpoints                           │     │
│  │              - Relayer callback handler                │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

#### Backend (.env)

```bash
# Server
PORT=5002
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://...

# Blockchain
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
PRIVATE_KEY=...

# Contracts
PREDICTION_HUB_ADDRESS=0x...
SETTLEMENT_ENGINE_ADDRESS=0x...
```

#### Frontend (.env)

```bash
# Network
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=sepolia

# Contracts
VITE_PREDICTION_HUB_ADDRESS=0x...
VITE_SETTLEMENT_ENGINE_ADDRESS=0x...

# Admin
VITE_ADMIN_ADDRESSES=0x...
```

---

## 📚 Summary

The Privora architecture provides:

- **Privacy-First Design**: FHEVM encryption for all sensitive data
- **Modular Architecture**: Separated concerns across layers
- **Scalable Backend**: MongoDB for flexible metadata storage
- **Developer-Friendly**: Clear separation of concerns

For implementation details, see:
- **FHEVM Integration:** [FHEVM_INTEGRATION.md](FHEVM_INTEGRATION.md)
- **API Reference:** [API_REFERENCE.md](API_REFERENCE.md)
- **Smart Contracts:** `protocol/contracts/`