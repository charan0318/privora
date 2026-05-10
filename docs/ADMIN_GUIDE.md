# Admin Panel User Guide

**Privora - Confidential Prediction Infrastructure**

Complete guide for administrators managing the Privora platform.

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Access & Permissions](#-access--permissions)
3. [Dashboard Statistics](#-dashboard-statistics)
4. [Signal Management](#-signal-management)
5. [Category Management](#-category-management)
6. [User Management](#-user-management)
7. [Analytics](#-analytics)
8. [System Settings](#-system-settings)

---

## 📊 Overview

The Admin Panel is the central hub for managing your encrypted prediction market platform. It provides comprehensive tools for:

- **Signal Lifecycle Management**: Create, sync, assign categories, and resolve signals
- **Category Organization**: Create and organize market categories
- **User Administration**: Monitor user activities and permissions
- **Real-time Analytics**: Track platform metrics and performance
- **System Configuration**: Configure platform-wide settings

### Admin Panel Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌───────────┐  ┌───────┐  ┌──────────┐       │
│  │   Signal │  │ Category  │  │ Users │  │Analytics │       │ 
│  │Management│  │Management │  │       │  │          │       │ 
│  └──────────┘  └───────────┘  └───────┘  └──────────┘       │ 
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │              System Settings                       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓                                  ↓
    ┌─────────┐                      ┌──────────┐
    │Smart    │                      │MongoDB   │
    │Contract │                      │Database  │
    └─────────┘                      └──────────┘
```

---

## 🔐 Access & Permissions

### Admin Authentication

**Location**: `frontend/src/utils/adminUtils.js`

```javascript
// Admin addresses are whitelisted in code
const ADMIN_ADDRESSES = {
  SUPER_ADMIN: '0x...',    // Full access
  CATEGORY_ADMIN: '0x...',  // Category management only
  BET_ADMIN: '0x...'        // Signal management only
};
```

### Access Control Flow

```
User connects wallet
         ↓
Check address in adminUtils.js
         ↓
    ┌─────────┐
    │Is Admin?│
    └─────────┘
         ↓
    YES  │  NO
    ↓    │    ↓
Enter    │  Show "Access Denied"
Admin    │  Redirect to home
Panel    │
```

### Permission Levels

| Role | Signal Management | Categories | Users | Analytics | Settings |
|------|-------------------|------------|-------|-----------|----------|
| **Super Admin** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Signal Admin** | ✅ Full | ❌ View Only | ❌ No | ✅ View | ❌ No |
| **Category Admin** | ❌ View Only | ✅ Full | ❌ No | ✅ View | ❌ No |

### How to Add a New Admin

1. Open `frontend/src/utils/adminUtils.js`
2. Add wallet address to appropriate role:
   ```javascript
   export const SUPER_ADMINS = [
     '0xYourNewAdminAddress...',
   ];
   ```
3. Save and deploy frontend

---

## 📈 Dashboard Statistics

### Overview Cards

When you enter the Admin Panel, you see 5 key metrics:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Signals│ Active Signals│ Total Users  │ Total Volume │ Categories   │
│      12      │       5      │      847     │  $12,450     │      8       │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Statistics Data Sources

| Metric | Source | Update Frequency | Decryption Required |
|--------|--------|------------------|---------------------|
| **Total Signals** | Smart Contract | Real-time | ❌ No |
| **Active Signals** | Smart Contract | Real-time | ❌ No |
| **Total Users** | Smart Contract (`getUniqueTradersCount()`) | Real-time | ❌ No |
| **Total Volume** | Smart Contract (`globalTotalVolume`) | Real-time | ✅ Yes (FHEVM decrypt) |
| **Categories** | MongoDB Database | Real-time | ❌ No |

### Volume Decryption Process

```
1. Contract stores encrypted global volume (euint64)
         ↓
2. Admin Panel calls getFhevmInstance()
         ↓
3. Retrieve encrypted handle: globalTotalVolume
         ↓
4. Call instance.publicDecrypt([handle])
         ↓
5. Display decrypted volume: $12,450 USDC
```

---

## 📊 Signal Management

### Main Features

1. **Blockchain Sync**: Import signals from smart contract to database
2. **Category Assignment**: Organize signals into categories
3. **Image Management**: Upload custom images for each signal
4. **Signal Resolution**: Declare winners and trigger payouts
5. **Filtering & Sorting**: Organize large signal lists
6. **Signal Creation**: Create new signals on-chain

### Syncing Signals from Blockchain

#### When to Sync

- ✅ After deploying new signals on-chain
- ✅ After signal data changes on contract
- ✅ Periodically to keep database updated

#### Sync Process

```
┌──────────────────────────────────────────────────────────┐
│  1. Click "Sync Signals" button                          │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  2. Frontend sends sync request to Backend               │
│     POST /api/signal-sync                                │
│     Body: { contractAddress, rpcUrl, abi, chainId }     │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  3. Backend connects to blockchain                       │
│     - Reads total signal count                           │
│     - Loops through all signal IDs                       │
│     - Fetches signal data (title, options, endTime, etc) │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  4. Backend updates MongoDB                              │
│     - Creates new signals                                │
│     - Updates existing signals                           │
│     - Skips duplicates                                   │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│  5. Success Message                                      │
│     "✓ Synced 3 new signals, ↻ Updated 2 signals"        │
└──────────────────────────────────────────────────────────┘
```

#### Step-by-Step Instructions

**Step 1**: Navigate to Admin Panel → **Signal Management** tab

**Step 2**: Click the green **"Sync Signals"** button (top-right)

**Step 3**: Wait for sync to complete
- You'll see a loading spinner
- Status updates appear in real-time

**Step 4**: Review sync results
```
✓ 3 new signals synced
↻ 2 signals updated
✗ 0 failed
```

**Step 5**: Refresh page if needed (signals appear immediately in most cases)

### Filtering & Sorting Signals

#### Filter Options

```
┌─────────────────────────────────────────────────────────────┐
│  Filter:  [All Categories ▼]  [All Status ▼]                │
│  Sort By: [ID ▼]  [↓]                      12 signals       │
└─────────────────────────────────────────────────────────────┘
```

#### Available Filters

| Filter Type | Options | Description |
|-------------|---------|-------------|
| **Category** | All Categories, Sports, Politics, Crypto, Entertainment, etc. | Show signals from specific category |
| **Status** | All, Active, Ended, Resolved | Filter by signal lifecycle stage |

#### Sort Options

| Sort By | Description |
|---------|-------------|
| **ID** | Contract signal ID (newest = highest) |
| **Name** | Alphabetical by signal title |
| **End Time** | Soonest ending first / Latest ending first |
| **Type** | Binary → Multiple → Nested |
| **Category** | Alphabetical by category name |

### Assigning Categories

#### Why Assign Categories?

- **Organization**: Users can browse signals by topic
- **Discoverability**: Categories appear on home page
- **Analytics**: Track performance by category

#### How to Assign

**Step 1**: Locate the signal you want to categorize

**Step 2**: Find the category dropdown on the right side of the signal card
```
┌───────────────────────────────┐
│ #5 - Will Bitcoin hit $100k?  │
│ Binary • 2d 5h left           │
│                               │
│  [📷 Image]  [No Category ▼]  │
└───────────────────────────────┘
```

**Step 3**: Click the dropdown and select a category
```
┌──────────────────────┐
│ No Category          │
│ ──────────────────   │
│ ⚽ Sports            │
│ 🏛️ Politics          │
│ 💰 Crypto             ← Select
│ 🎬 Entertainment     │
│ 🌍 World Events      │
└──────────────────────┘
```

**Step 4**: Success! Category is saved immediately
```
✅ Category updated to "Crypto"
```

### Image Management

#### Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WEBP (.webp)
- SVG (.svg)

**Maximum file size**: 5 MB

#### Upload Process

```
┌──────────────────────────────────────────┐
│  1. Click image placeholder or image     │
│     (Shows "Upload" text)                │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  2. Select image from your computer      │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  3. Image uploads automatically          │
│     (Shows loading spinner)              │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  4. Success! Image appears in card       │
│     Stored: /uploads/signal-images/xxx.webp │
└──────────────────────────────────────────┘
```

### Resolving Signals

#### When to Resolve

✅ **Resolve when**:
- Signal end time has passed
- Real-world outcome is known
- You have verified the result

❌ **Don't resolve**:
- Signal is still active (unless emergency early resolution)
- Outcome is disputed or unclear
- You don't have authority to decide

#### Resolution Types

| Signal Type | Resolution Method |
|-------------|-------------------|
| **Binary (Yes/No)** | Select winner: Option 0 (Yes) or Option 1 (No) |
| **Multiple Choice** | Select winning option index (0, 1, 2, ...) |
| **Nested (Multi-Market)** | Select option AND outcome (Yes/No) |

#### Binary/Multiple Choice Resolution

**Step 1**: Click the checkmark icon (✓) on the signal card

**Step 2**: Review signal details in modal
```
┌─────────────────────────────────────────┐
│  Resolve Signal                         │
│  #5 - Will Bitcoin hit $100k by 2025?   │
│                                         │
│  ⚠️ Warning: This action is permanent   │
│                                         │
│  Select Winning Option:                 │
│  ┌────────────────────────────────┐     │
│  │ -- Select Winner --        ▼   │     │
│  │ Option 1: Yes                  │     │
│  │ Option 2: No                   │     │
│  └────────────────────────────────┘     │
│                                         │
│  Signal Details:                        │
│  Type: Binary                           │
│  Total Signals: 247                     │
│  Options: 2                             │
│  End Time: Jan 1, 2025 12:00 AM         │
│  ✓ Signal ended - ready to resolve      │
│                                         │
│  [Cancel]  [Resolve Signal]             │
└─────────────────────────────────────────┘
```

**Step 3**: Select the winning option from dropdown

**Step 4**: Click **"Resolve Signal"**

**Step 5**: Confirm transaction in MetaMask

**Step 6**: Wait for blockchain confirmation

**Step 7**: Success! Winners are calculated
```
✅ Signal resolved successfully! Winner: Option 1
   TX: 0xabc123...

✅ Winners updated in DB: 143 won, 104 lost
```

### Creating New Signals

#### Overview

Admins can create new signals directly from the admin panel without writing code or using Remix.

#### Create Signal Flow

```
1. Click "Create Signal" button
         ↓
2. Fill out signal form
   - Type (Binary/Multiple/Nested)
   - Title & Description
   - Options
   - End Time
   - Min/Max Allocation
   - Liquidity
   - Category (optional)
         ↓
3. Approve USDC (if needed)
         ↓
4. Sign transaction
         ↓
5. Signal created on-chain
         ↓
6. Auto-sync to database
```

#### Step-by-Step Instructions

**Step 1**: Click **"Create Signal"** button (top-right, blue button)

**Step 2**: Choose signal type
```
┌─────────────────────────────────────────┐
│  Signal Type *                            │
│  ┌────────────────────────────────┐     │
│  │ Binary (Yes/No)            ▼   │     │
│  │ Multiple Choice                │     │
│  │ Nested (Multi-Market)          │     │
│  └────────────────────────────────┘     │
│                                         │
│  Simple yes/no question with 2 outcomes │
└─────────────────────────────────────────┘
```

**Step 3**: Enter signal details

| Field | Required | Example | Notes |
|-------|----------|---------|-------|
| **Title** | ✅ Yes | "Will Bitcoin reach $100k by end of 2025?" | Keep under 100 characters |
| **Description** | ✅ Yes | "Signal resolves YES if BTC price..." | Explain resolution criteria |
| **Options** | ✅ Yes | "Yes", "No" | Min 2 options. Add more for Multiple Choice |
| **End Time** | ✅ Yes | 2025-12-31 23:59 | Must be in the future |
| **Min Allocation** | ✅ Yes | 1 USDC | Minimum allocation users can submit |
| **Max Allocation** | ✅ Yes | 1000 USDC | Maximum allocation users can submit |
| **Liquidity** | ✅ Yes | 500 USDC | Your initial liquidity (returned after resolution) |
| **Category** | ❌ No | Crypto | Helps users find signal |

**Step 4**: Add options (for Multiple/Nested types)

- Click **"+ Add Option"** to add more
- Click **X** button to remove options
- Minimum: 2 options
- Maximum: No limit (but UI becomes crowded after 10)

**Step 5**: Review and approve USDC

If this is your first signal or you need more allowance:

```
┌─────────────────────────────────────────┐
│  ⚠️ Approval Required                   │
│  You need to approve 500 USDC for the   │
│  contract to spend before creating signal │
│                                         │
│  [Approve USDC]                         │
└─────────────────────────────────────────┘
```

Click **"Approve USDC"** → Sign transaction → Wait for confirmation

**Step 6**: Create the signal

Once approved:
```
┌─────────────────────────────────────────┐
│  ✓ Ready: USDC allowance approved       │
│  You can now create the signal.         │
│                                         │
│  [Create Signal]                        │
└─────────────────────────────────────────┘
```

Click **"Create Signal"** → Sign transaction → Wait

**Step 7**: Auto-sync (happens automatically)

After signal is created:
1. Wait 2 seconds
2. System syncs with blockchain
3. Signal appears in list
4. Category is assigned automatically (if selected)

**Success Message**:
```
✅ Signal created successfully! Gas used: 2,847,392
✅ Signal synced successfully!
```

---

## 📁 Category Management

### Overview

Categories help organize signals by topic, making it easier for users to find markets they're interested in.

### Category Features

- **Drag-and-drop reordering**: Change display order on homepage
- **Custom icons**: Emoji icons for visual identification
- **Color coding**: Each category has a unique color
- **Infinite categories**: No limit on category count

### Creating Categories

**Step 1**: Navigate to **Categories** tab

**Step 2**: Fill out creation form
```
┌─────────────────────────────────────────────────────────┐
│  Create New Category                                    │
│  ┌──────────┬──────┬────────┬──────────┐                │
│  │ Name     │ Icon │ Color  │ [Create] │                │
│  ├──────────┼──────┼────────┼──────────┤                │
│  │ Crypto   │ 💰   │ 🎨Blue │          │                │
│  └──────────┴──────┴────────┴──────────┘                │
└─────────────────────────────────────────────────────────┘
```

**Step 3**: Enter category name (e.g., "Crypto", "Sports", "Politics")

**Step 4**: Click the emoji icon picker
- Browse or search for emoji
- Click to select

**Step 5**: Choose color
- Click color picker
- Select from palette or enter hex code

**Step 6**: Click **"Create"**

**Result**: Category appears in the list below

### Editing Categories

**Step 1**: Find category in list

**Step 2**: Click edit icon (pencil)

**Step 3**: Inputs become editable
```
┌─────────────────────────────────────────────┐
│  ┌──────────┬──────┬────────┬─────────────┐ │
│  │ Name     │ Icon │ Color  │ [Save] [X]  │ │
│  ├──────────┼──────┼────────┼─────────────┤ │
│  │ Crypto   │ 💰   │ 🎨     │             │ │
│  └──────────┴──────┴────────┴─────────────┘ │
└─────────────────────────────────────────────┘
```

**Step 4**: Make changes

**Step 5**: Click **"Save"** or **X** to cancel

### Reordering Categories

Categories appear on the homepage in **displayOrder** sequence.

**To reorder**:

1. Click and hold the **⋮⋮** grip icon on the left
2. Drag category up or down
3. Release to drop
4. Order saves automatically

### Deleting Categories

**Warning**: Deleting a category does NOT delete signals in that category. Signals become uncategorized.

**Steps**:

1. Click **trash icon** (🗑️) next to category
2. Confirm deletion in browser alert
3. Category is removed from database

**What happens to signals**:
- Signals in that category: categoryId set to `null`
- Signals still exist and are playable
- They appear under "No Category" in filters

---

## 👥 User Management

### Overview

The User Management tab displays all users who have interacted with your platform.

**Data Source**: Smart contract (`uniqueTraders` mapping)

### User Table

```
┌──────────┬───────────────────┬─────────┬────────────────┬─────────┐
│ Address  │ Total Signals     │ Volume  │ Win/Loss Ratio │ Status  │
├──────────┼───────────────────┼─────────┼────────────────┼─────────┤
│ 0xABC... │        12         │ $1,245  │    8W / 4L     │ Active  │
│ 0xDEF... │         5         │  $890   │    2W / 3L     │ Active  │
│ 0x789... │        47         │ $8,920  │   31W / 16L    │ Active  │
└──────────┴───────────────────┴─────────┴────────────────┴─────────┘
```

### User Information

| Column | Description | Source |
|--------|-------------|--------|
| **Address** | User's wallet address | Blockchain |
| **Total Signals** | Number of signals placed | MongoDB (aggregated) |
| **Volume** | Total USDC wagered | MongoDB (aggregated) |
| **Win/Loss** | Winning vs losing signals | MongoDB (resolved signals only) |
| **Status** | Active / Inactive / Banned | MongoDB |

### User Actions

Currently, the User Management tab is **view-only**. Future features:

- [ ] Ban/unban users
- [ ] View user's signal history
- [ ] Export user data
- [ ] Contact user (if email provided)

---

## 📊 Analytics

### Overview

The Analytics tab provides insights into platform performance and user behavior.

### 7.1 Overview Metrics

```
┌─────────────────────────────────────────────────────────┐
│  Platform Analytics                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Total Volume │  │ Total Signals│  │ Active Users │   │
│  │   $45,890    │  │     247      │  │     1,834    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Avg Signal  │  │  Win Rate    │  │ Liquidity    │   │
│  │   $185.77    │  │     58.3%    │  │  $12,500     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Charts

#### Volume Over Time

Line chart showing daily/weekly/monthly volume trends.

#### Category Distribution

Pie chart showing signal distribution by category.

#### User Activity

Bar chart showing daily active users.

### 7.3 Top Performers

#### Most Popular Signals

| Rank | Signal Title | Category | Volume | Participants |
|------|--------------|----------|--------|--------------|
| 1 | Bitcoin to $100k? | Crypto | $12,450 | 847 |
| 2 | Lakers win NBA? | Sports | $8,920 | 623 |
| 3 | Trump wins 2024? | Politics | $7,530 | 891 |

#### Top Researchers

| Rank | Address | Win Rate | Total Volume | Total Signals |
|------|---------|----------|--------------|---------------|
| 1 | 0xABC... | 72.3% | $8,920 | 47 |
| 2 | 0xDEF... | 68.9% | $6,450 | 34 |
| 3 | 0x789... | 65.2% | $5,230 | 29 |

---

## ⚙️ System Settings

### Overview

System Settings control platform-wide configuration and parameters.

### 8.1 Available Settings

```
┌─────────────────────────────────────────────┐
│  System Settings                            │
├─────────────────────────────────────────────┤
│                                             │
│  Platform Configuration                     │
│  ┌────────────────────────────────────┐     │
│  │ Platform Name                      │     │
│  │ [Privora]                          │     │
│  └────────────────────────────────────┘     │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │ Platform Fee (%)                   │     │
│  │ [2.5]                              │     │
│  └────────────────────────────────────┘     │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │ Minimum Signal (USDC)              │     │
│  │ [1]                                │     │
│  └────────────────────────────────────┘     │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │ Maximum Signal (USDC)              │     │
│  │ [10000]                            │     │
│  └────────────────────────────────────┘     │
│                                             │
│  [Save Changes]                             │
└─────────────────────────────────────────────┘
```

### 8.2 Configuration Parameters

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Platform Name** | String | "Privora" | Displayed in header/footer |
| **Platform Fee** | Number (%) | 2.5 | Fee taken from total pool |
| **Min Signal** | Number (USDC) | 1 | Global minimum allocation |
| **Max Signal** | Number (USDC) | 10000 | Global maximum allocation |
| **Enable Registration** | Boolean | true | Allow new users |
| **Maintenance Mode** | Boolean | false | Disable signals temporarily |

### 8.3 Network Configuration

**Current Network**: Sepolia Testnet

**Contract Addresses**:
```javascript
{
  PREDICTION_HUB: "0x...",
  SETTLEMENT_ENGINE: "0x...",
  INTELLIGENCE_LEDGER: "0x...",
  GOVERNANCE_CONTROLLER: "0x...",
  TOPIC_REGISTRY: "0x...",
  USDC: "0x..."
}
```

### 8.4 Database Configuration

**MongoDB Connection**: Configured via environment variables

**Backend** `.env`:
```bash
MONGODB_URI=mongodb://localhost:27017/privora
```

**Collections**:
- `predictions`: Prediction metadata and sync data
- `categories`: Category list
- `userpositions`: User signal positions and win/loss tracking

---

## 🛠️ Troubleshooting

### Common Issues

#### Issue: "Access Denied"

**Cause**: Your wallet address is not whitelisted as admin

**Solution**:
1. Check `frontend/src/utils/adminUtils.js`
2. Add your address to appropriate admin array
3. Redeploy frontend

#### Issue: "Sync Signals" fails

**Causes**:
- Backend not running
- Wrong network selected
- MongoDB not connected

**Solutions**:
1. Check backend is running: `npm run dev` in `backend/` folder
2. Check MetaMask is on Sepolia network
3. Check MongoDB is running: `mongod --version`

#### Issue: "Transaction failed"

**Solutions**:
- Check you have enough ETH for gas
- Verify signal is still active
- Check min/max allocation amounts

---

## 📚 Summary

The Admin Panel provides comprehensive tools for managing your Privora platform.

**Key Features:**
- ✅ **Signal Management**: Create, sync, resolve signals
- ✅ **Category Management**: Organize markets
- ✅ **User Analytics**: Track platform metrics
- ✅ **System Configuration**: Platform-wide settings

For more information, see:
- **User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Technical Architecture:** [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
- **FHEVM Integration:** [FHEVM_INTEGRATION.md](FHEVM_INTEGRATION.md)