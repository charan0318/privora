# Troubleshooting

Common issues and solutions for Privora development and deployment.

---

## 📋 Table of Contents

1. [Frontend Issues](#-frontend-issues)
2. [Backend Issues](#-backend-issues)
3. [Smart Contract Issues](#-smart-contract-issues)
4. [FHEVM Issues](#-fhevm-issues)
5. [Deployment Issues](#-deployment-issues)

---

## 🖥️ Frontend Issues

### Wallet Connection Fails

**Symptoms:**
- "No provider found" error
- Wallet not connecting

**Solutions:**
```javascript
// Check if window.ethereum exists
if (typeof window.ethereum === 'undefined') {
  console.log('MetaMask not installed');
}

// Request accounts
await window.ethereum.request({ method: 'eth_requestAccounts' });
```

**Common Fixes:**
1. Install MetaMask browser extension
2. Check network is Sepolia
3. Refresh page after wallet install

### Build Errors

**Error:** `Cannot find module 'fhevmjs'`

```bash
# Solution
npm install fhevmjs
# or
yarn add fhevmjs
```

**Error:** `Module not found: Can't resolve '@wagmi/core'`

```bash
npm install @wagmi/core wagmi viem
```

### CORS Errors

**Symptoms:** API requests blocked

**Solution:**
```javascript
// backend/src/app.js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## ⚙️ Backend Issues

### MongoDB Connection Failed

**Error:** `MongoNetworkError: failed to connect to server`

**Solutions:**
```bash
# Check MongoDB is running
mongod --version

# Start MongoDB
net start MongoDB

# Check connection string
mongodb://localhost:27017/privora
```

### Redis Connection Refused

**Error:** `connect ECONNREFUSED 127.0.0.1:6379`

```bash
# Start Redis
redis-server

# Or with Docker
docker run -p 6379:6379 redis
```

### Environment Variables Missing

**Error:** `ALCHEMY_API_KEY is not defined`

```bash
# Create .env file
cp .env.example .env

# Add required variables
ALCHEMY_API_KEY=your_key_here
PRIVATE_KEY=0x...
```

---

## 📜 Smart Contract Issues

### Deployment Failed

**Error:** `insufficient funds for intrinsic transaction cost`

**Solution:**
```bash
# Get Sepolia ETH from faucet
# https://sepoliafaucet.com

# Check balance
npx hardhat run scripts/checkBalance.js --network sepolia
```

### Verification Failed

**Error:** `Already Verified`

```bash
# Use different constructor args or skip
npx hardhat verify --network sepolia <address> "arg1" "arg2"
```

### Gas Limit Exceeded

**Error:** `Transaction ran out of gas`

```solidity
// Increase gas limit
await contract.function({
  gasLimit: 5000000
});
```

---

## 🔐 FHEVM Issues

### Encryption Failed

**Error:** `FHEVM initialization failed`

**Solution:**
```javascript
// Check Zama gateway URL
const gatewayUrl = 'https://gateway.sepolia.zama.ai';

// Initialize with correct config
const instance = await createInstance({
  networkUrl: gatewayUrl,
  chainId: 11155111
});
```

### Decryption Error

**Error:** `Invalid ciphertext`

**Solution:**
```javascript
// Ensure correct keypair
const { publicKey, privateKey } = generateKeypair();

// Verify encryption
const encrypted = await instance.encrypt(value, publicKey);
const decrypted = await instance.decrypt(privateKey, encrypted);
```

### Gateway Timeout

**Error:** `Gateway request timeout`

**Solution:**
```javascript
// Add retry logic
const maxRetries = 3;
for (let i = 0; i < maxRetries; i++) {
  try {
    const result = await instance.encrypt(value);
    break;
  } catch (error) {
    if (i === maxRetries - 1) throw error;
    await sleep(1000);
  }
}
```

---

## 🚀 Deployment Issues

### Docker Build Failed

**Error:** `COPY failed: file not found`

**Solution:**
```dockerfile
# Check .dockerignore
echo "node_modules" >> .dockerignore
echo ".git" >> .dockerignore
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

```bash
# Find process using port
netstat -ano | findstr :5002

# Kill process
taskkill /PID <pid> /F
```

### SSL Certificate Error

**Error:** `NET::ERR_CERT_AUTHORITY_INVALID`

```bash
# Use Let's Encrypt
certbot --nginx -d yourdomain.com

# Or for development
mkcert -install
mkcert localhost
```

---

## 🆘 Getting Help

### Check Logs

```bash
# Backend logs
npm run dev

# Frontend logs
npm run dev

# Docker logs
docker logs <container_name>
```

### Debug Mode

```bash
# Enable debug
DEBUG=* npm run dev

# Specific module
DEBUG=privora:* npm run dev
```

### Common Commands

```bash
# Reset database
npm run db:reset

# Clear cache
npm run cache:clear

# Rebuild
npm run clean
npm install
npm run build
```

---

## 📚 Summary

Quick fixes:
- **Frontend:** Check wallet, reinstall dependencies
- **Backend:** Verify MongoDB/Redis, check .env
- **Contracts:** Fund wallet, increase gas
- **FHEVM:** Check gateway, retry encryption
- **Deployment:** Check ports, SSL certs

For detailed documentation:
- **Getting Started:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Technical Architecture:** [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)