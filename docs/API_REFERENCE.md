# API Reference

REST API endpoints and schemas for the Privora backend.

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Authentication](#-authentication)
3. [Endpoints](#-endpoints)
4. [Schemas](#-schemas)
5. [Error Handling](#-error-handling)

---

## 🌐 Overview

The Privora API provides RESTful endpoints for:
- Prediction signal management
- Category management
- User position tracking
- Analytics and statistics
- Relayer callbacks

**Base URL**: `http://localhost:5002/api`

**Production URL**: `https://api.privora.ai/api`

---

## 🔐 Authentication

Most endpoints are public. Admin endpoints require wallet signature verification.

### Wallet Authentication

```javascript
// Headers for authenticated requests
{
  "x-wallet-address": "0x...",
  "x-wallet-signature": "0x...",
  "x-message": "Login to Privora: 1234567890"
}
```

---

## 📡 Endpoints

### Predictions

#### GET `/predictions`

List all predictions with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category ID |
| `status` | string | Filter by status (active, ended, resolved) |
| `search` | string | Search by title/description |
| `sort` | string | Sort field (id, name, endTime, volume) |
| `order` | string | Sort order (asc, desc) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 30) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "predictionId": 1,
      "title": "Will Bitcoin reach $100k?",
      "description": "Bet on BTC price target",
      "options": ["Yes", "No"],
      "predictionType": 0,
      "endTime": "2025-12-31T00:00:00Z",
      "totalVolume": 12500,
      "participantCount": 847,
      "isResolved": false,
      "category": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Crypto",
        "icon": "💰"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 150,
    "pages": 5
  }
}
```

#### GET `/predictions/:id`

Get a single prediction by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "predictionId": 1,
    "title": "Will Bitcoin reach $100k?",
    "description": "Bet on BTC price target",
    "options": ["Yes", "No"],
    "predictionType": 0,
    "endTime": "2025-12-31T00:00:00Z",
    "minPositionAmount": 1,
    "maxPositionAmount": 10000,
    "liquidity": 500,
    "isResolved": false,
    "winningOption": null,
    "category": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Crypto",
      "icon": "💰"
    }
  }
}
```

#### POST `/predictions` (Admin)

Create a new prediction.

**Request Body:**
```json
{
  "title": "Will Bitcoin reach $100k?",
  "description": "Bet on BTC price target",
  "options": ["Yes", "No"],
  "predictionType": 0,
  "endTime": "2025-12-31T00:00:00Z",
  "minPositionAmount": 1,
  "maxPositionAmount": 10000,
  "liquidity": 500,
  "categoryId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictionId": 1,
    "transactionHash": "0x..."
  }
}
```

#### PUT `/predictions/:id` (Admin)

Update a prediction.

**Request Body:**
```json
{
  "title": "Updated title",
  "categoryId": "507f1f77bcf86cd799439011"
}
```

#### DELETE `/predictions/:id` (Admin)

Delete a prediction.

---

### Categories

#### GET `/categories`

List all categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Crypto",
      "icon": "💰",
      "color": "#3B82F6",
      "displayOrder": 0
    }
  ]
}
```

#### POST `/categories` (Admin)

Create a category.

**Request Body:**
```json
{
  "name": "Crypto",
  "icon": "💰",
  "color": "#3B82F6"
}
```

#### PUT `/categories/:id` (Admin)

Update a category.

#### DELETE `/categories/:id` (Admin)

Delete a category.

#### PUT `/categories/reorder` (Admin)

Reorder categories.

**Request Body:**
```json
{
  "order": ["id1", "id2", "id3"]
}
```

---

### User Positions

#### GET `/user-positions/:user/:predictionId`

Get user position for a prediction.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPosition": true,
    "isResolved": false,
    "isWinner": null,
    "positions": [
      {
        "optionIndex": 0,
        "amount": 50,
        "transactionHash": "0x..."
      }
    ]
  }
}
```

#### POST `/user-positions/sync` (Admin)

Sync positions from blockchain.

**Request Body:**
```json
{
  "predictionId": 1
}
```

---

### Analytics

#### GET `/analytics/stats`

Get platform statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVolume": 45890,
    "totalPredictions": 247,
    "activeUsers": 1834,
    "avgPrediction": 185.77,
    "winRate": 58.3,
    "liquidity": 12500
  }
}
```

#### GET `/analytics/top-performers`

Get top researchers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "0xABC...",
      "winRate": 72.3,
      "totalVolume": 8920,
      "totalPredictions": 47
    }
  ]
}
```

---

### Callbacks

#### POST `/callback/relayer`

Relayer callback endpoint for payout processing.

**Request Body:**
```json
{
  "predictionId": 1,
  "user": "0x...",
  "requestId": "0x..."
}
```

---

## 📋 Schemas

### Prediction Schema

```typescript
interface Prediction {
  predictionId: number;
  title: string;
  description: string;
  options: string[];
  predictionType: 0 | 1 | 2; // Binary, Multiple, Nested
  endTime: Date;
  minPositionAmount: number;
  maxPositionAmount: number;
  liquidity: number;
  isResolved: boolean;
  winningOption: number | null;
  winningOutcome: number | null; // For nested
  totalVolume: number;
  participantCount: number;
  categoryId: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Category Schema

```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserPosition Schema

```typescript
interface UserPosition {
  id: string;
  userAddress: string;
  predictionId: number;
  optionIndex: number;
  outcome: number | null; // For nested
  amount: number;
  isWinner: boolean | null;
  hasClaimed: boolean;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `BAD_REQUEST` | Invalid request format |
| `INTERNAL_ERROR` | Server error |

---

## 📚 Summary

The API provides comprehensive endpoints for:
- **Prediction Management**: CRUD operations for signals
- **Category Management**: Organize markets by topic
- **User Tracking**: Position and history queries
- **Analytics**: Platform metrics and insights
- **Callbacks**: Relayer integration

For implementation details, see:
- **Backend Source:** `backend/src/`
- **Technical Architecture:** [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)