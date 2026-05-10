# User Guide

Complete guide for using the Privora confidential prediction infrastructure as an researcher.

---

## 📋 Table of Contents

1. [Getting Started](#-getting-started)
2. [Connecting Your Wallet](#-connecting-your-wallet)
3. [Browsing Markets](#-browsing-markets)
4. [Understanding Signal Types](#-understanding-signal-types)
5. [Submitting Signals](#-submitting-signals)
6. [My Dashboard](#-my-dashboard)
7. [Payout System](#-payout-system)
8. [Privacy & FHEVM](#-privacy--fhevm)
9. [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🚀 Getting Started

### Connecting Your Wallet

**Step 1:** Visit the platform homepage
- The platform requires a Web3 wallet (MetaMask, WalletConnect, etc.)

**Step 2:** Click "Connect Wallet" button
- Located in the top navigation bar
- Select your preferred wallet provider
- Approve the connection request in your wallet

**Step 3:** Wait for FHEVM initialization
- After connecting, the platform initializes FHEVM encryption (~1-2 seconds)
- You'll see a notification: "🔐 Privacy encryption ready"
- This enables private signal submission with encrypted amounts

**Supported Networks:**
- Sepolia Testnet
- Zama Devnet (for testing)

**First-time Setup:**
```
1. Connect wallet → MetaMask popup appears
2. Approve connection → Wallet connected
3. FHEVM initializes → Encryption ready
4. Start browsing markets! → You're ready to research
```

---

## 🔍 Browsing Markets

### Filter Tabs

The home page offers 4 main filters:

| Filter | Icon | Description | Sorting Logic |
|--------|------|-------------|---------------|
| **Trending** | 📈 TrendingUp | Most popular markets | By volume (highest first) |
| **New** | ⚡ Zap | Recently created markets | By creation date (newest first) |
| **Ending Soon** | ⏰ Clock | Markets closing within 24 hours | By end time (soonest first) |
| **Bookmarked** | ⭐ Star | Your saved markets | Your bookmarked signals only |

### Category Tabs

**Below the filters**, you'll see category tabs (e.g., Sports, Politics, Entertainment).

**How to use:**
1. Click on a category tab
2. The signal grid filters to show only signals in that category
3. The active filter switches to "Category Markets"
4. Click again to deselect and view all markets

### Search Bar

**Located in the header**, the search bar allows you to search markets by:
- Signal title
- Signal description

**How it works:**
1. Type keywords in the search bar
2. Results filter in real-time
3. A blue banner shows: "Searching for: [your query]"
4. Click "Clear" to remove the search filter

---

## 📊 Understanding Signal Types

The platform supports **3 signal types**:

### Binary Signals (Type 0)

**Description:** Two-outcome markets (e.g., "Yes/No", "Win/Lose")

**Example:**
```
"Will Bitcoin reach $100,000 by end of 2025?"
- Option 1: Yes
- Option 2: No
```

### Multiple Choice Signals (Type 1)

**Description:** Markets with 3+ exclusive outcomes

**Example:**
```
"Who will win the 2025 NBA Championship?"
- Option 1: Lakers
- Option 2: Celtics
- Option 3: Warriors
- Option 4: Nuggets
```

### Nested Signals (Type 2)

**Description:** Multiple propositions, each with Yes/No outcomes. Each proposition is resolved independently.

**Example:**
```
"2025 Tech Predictions"
- Proposition 1: "Apple releases VR headset" → YES or NO
- Proposition 2: "Tesla stock hits $300" → YES or NO
- Proposition 3: "ChatGPT reaches 1B users" → YES or NO
```

---

## 📤 Submitting Signals

### Step-by-Step Process

**1. Navigate to Signal Details**
- Click on any signal card from the home page
- You'll see the full signal details page

**2. Connect Wallet (if not connected)**
- Click "Connect Wallet" button
- Approve wallet connection
- Wait for FHEVM encryption to initialize

**3. Check Your Balance**
- Your USDC balance is displayed at the top
- Click "Decrypt Balance" to reveal your encrypted balance (first time only)
- Balance is cached for future use

**4. Select Your Option**

**For Binary/Multiple Signals:**
- Click on the option card you want to research
- The card highlights in blue

**For Nested Signals:**
- Click on a proposition card
- Select either "YES" or "NO" button

**5. Enter Research Allocation**
- Type the amount in USDC (e.g., 10, 25, 100)
- Minimum allocation: displayed on the page (e.g., $1)
- Maximum allocation: displayed on the page (e.g., $10,000)

**6. Review Potential Returns**

The platform calculates your **potential profit** using **Parimutuel odds**:

**Formula:**
```
potentialReturn = (yourAmount / newWinnerPool) × (totalPool - liquidity) - yourAmount
```

**7. Submit Signal**
- Click the green "Submit Signal" button
- **FHEVM encrypts your allocation** (keeps it private on-chain)
- Approve the transaction in your wallet
- Wait for transaction confirmation (~5-15 seconds)

**8. Success Confirmation**
- A success modal appears with transaction details
- Your signal is added to transaction cache
- Balance is optimistically updated (decremented)
- You can view your position in the "My Positions" tab

---

## 📊 My Dashboard

Access your dashboard by clicking **"Dashboard"** in the navigation bar.

### Dashboard Sections

The dashboard has **3 tabs**:

#### 1. Active Signals

**Shows:** All signals you've submitted that are still ongoing

**Displayed Information:**
- Signal title & description
- Time remaining (e.g., "5d 12h left")
- Signal type (Binary, Multiple, Nested)
- Status badge: "Active" (green)

#### 2. Ended Signals

**Shows:** Signals that have ended but are not yet resolved, or signals where you lost

**Displayed Information:**
- Signal title & description
- Status badge: "Ended" (yellow) or "Resolved" (blue)
- Win/Loss indicator (if resolved)
  - Red "Lost" badge if you lost
  - No badge if awaiting resolution

#### 3. Claims

**Shows:** Resolved signals where you WON and can claim your rewards

**Displayed Information:**
- Signal title & description
- Status badge: "Resolved" (blue)
- Win indicator: Green "You Won!" with trophy icon
- Claim status: "Claimed" badge (if already claimed)

---

## 💰 Payout System

The payout system has **2 steps**: **Request Payout** → **Claim Rewards**

### Step 1: Request Payout

**When:** After a signal is resolved and you won

**What it does:**
- Triggers the **relayer callback** to decrypt your encrypted position
- Relayer calculates your exact payout amount
- Payout amount is stored on-chain (unencrypted)

**How to request:**
1. Go to the signal details page of a resolved signal
2. You'll see a yellow button: **"Request Payout"**
3. Click the button
4. Approve the transaction in your wallet
5. Wait 1-2 minutes for relayer to process

### Step 2: Claim Rewards

**When:** After payout request is processed

**What it does:**
- Withdraws your winnings from the smart contract to your wallet
- Updates your USDC balance

**How to claim:**
1. After requesting payout, refresh the page
2. The button changes to green: **"Claim $XXX.XX"**
3. Click the "Claim" button
4. Approve the transaction in your wallet
5. Your winnings are transferred to your wallet ✅

---

## 🔐 Privacy & FHEVM

### What is FHEVM?

**FHEVM (Fully Homomorphic Encryption Virtual Machine)** enables **private smart contracts** on blockchain.

**Key Benefits:**
- Your signal allocations are **encrypted on-chain**
- Other users **cannot see** how much you allocated
- Smart contracts can compute on encrypted data without decrypting it
- Only you (and authorized relayers) can decrypt your data

### How Your Data is Protected

#### Signal Submission
1. You enter allocation amount (e.g., $50)
2. **FHEVM encrypts the amount** before sending to blockchain
3. Encrypted value is stored on-chain: `0x7f8e9a3b...` (gibberish to others)
4. Only you hold the decryption key

#### Position Viewing
1. You can decrypt your own positions anytime
2. Click "Decrypt" button on My Positions tab
3. FHEVM uses your wallet signature to decrypt
4. Decrypted values are cached locally (browser)

#### Payout Calculation
1. When signal resolves, admin uses **relayer callback**
2. Relayer decrypts ALL user positions (via gateway)
3. Calculates payouts using parimutuel formula
4. Stores final payout amounts on-chain (unencrypted)

**Privacy Trade-off:**
- During betting: **fully private** (encrypted amounts)
- After resolution: **payouts are public** (needed for claiming)

---

## ❓ FAQ & Troubleshooting

### General Questions

**Q: Do I need cryptocurrency to use the platform?**
A: Yes, you need USDC (stablecoin) on the supported network. You also need native tokens (e.g., ETH) for gas fees.

**Q: Can other users see how much I allocated?**
A: No! Your allocations are encrypted using FHEVM. Only you can decrypt them. After resolution, your payout amount becomes public.

**Q: How are odds calculated?**
A: The platform uses **Parimutuel odds** (pool-based). Your payout depends on:
- Total pool size
- How much is allocated on the winning option
- Your share of the winning pool

**Q: When can I claim my rewards?**
A: After the signal is resolved AND you've requested payout (processed by relayer). The process takes ~1-2 minutes.

**Q: What happens if I lose?**
A: Your allocation goes into the total pool and is distributed to winners. You cannot claim anything, and the "Request Payout" button will not appear.

**Q: Can I cancel a signal after submitting it?**
A: No. All signals are final once the transaction is confirmed on-chain.

### Troubleshooting

#### Issue: "FHEVM not initialized"

**Solution:**
1. Wait 2-3 seconds after connecting wallet
2. Refresh the page
3. Ensure you're on a supported network (Sepolia)
4. Check browser console for errors

#### Issue: "Insufficient balance"

**Solution:**
1. Click "Decrypt Balance" to reveal your actual balance
2. Ensure you have enough USDC for the allocation
3. Reserve some USDC for gas fees (~$0.50-$1.00)
4. If needed, fund your wallet with USDC

#### Issue: "Request Payout button doesn't appear"

**Possible Reasons:**
1. Signal is not yet resolved → Wait for admin to resolve
2. You lost the signal → MongoDB marked you as loser (no payout)
3. You already requested payout → Refresh the page to see claim button
4. Relayer is processing → Wait 1-2 minutes and refresh

#### Issue: "Payout request stuck in 'Requested' state"

**Solution:**
1. Wait 2-3 minutes (relayer may be slow)
2. Refresh the page
3. Check backend logs: `backend/routes/callback.js`
4. Ensure relayer service is running
5. Contact support if stuck for >5 minutes

#### Issue: "Transaction failed"

**Possible Reasons:**
1. Insufficient gas fees
2. Signal already ended
3. Allocation below minimum or above maximum
4. Contract paused by admin

**Solution:**
- Check error message in wallet
- Ensure you have native tokens for gas
- Verify signal is still active
- Check min/max allocation amounts on signal details page

#### Issue: "Balance not updating after claim"

**Solution:**
1. Wait 10-15 seconds for transaction confirmation
2. Click "Decrypt Balance" button to refresh
3. Check transaction on block explorer
4. Clear browser cache and refresh

#### Issue: "My positions not showing"

**Solution:**
1. Positions are stored in **browser cache** (localStorage)
2. If you cleared browser data, positions are lost (but still on-chain)
3. Check "Order History" tab to see your signals
4. Your actual winnings are safe on-chain (claimable after resolution)

**Note:** Losing local cache only affects viewing, not claiming payouts!

---

## 📚 Summary

The Privora platform provides a **private, decentralized prediction market** using advanced encryption technology.

**Key Features:**
- ✅ **Private Research**: Allocations encrypted with FHEVM
- ✅ **Parimutuel Odds**: Fair, pool-based payout system
- ✅ **Multiple Signal Types**: Binary, Multiple Choice, Nested
- ✅ **Easy Claiming**: Request payout → Claim rewards (2 steps)
- ✅ **Dashboard Tracking**: View active, ended, and claimable signals
- ✅ **Transparent Resolution**: Decentralized, admin-resolved outcomes

**Quick Start Checklist:**
1. ✓ Connect wallet
2. ✓ Wait for FHEVM initialization
3. ✓ Decrypt balance (first time)
4. ✓ Browse signals and select a market
5. ✓ Submit encrypted allocation
6. ✓ Track in Dashboard
7. ✓ Claim rewards after resolution

For more technical details, see:
- **Admin Guide:** [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- **FHEVM Integration:** [FHEVM_INTEGRATION.md](FHEVM_INTEGRATION.md)
- **Smart Contracts:** `protocol/contracts/`

Happy researching! 🎯