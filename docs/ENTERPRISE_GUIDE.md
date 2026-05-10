# Enterprise Guide

Enterprise deployment, scaling, and integration guide for Privora.

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [Deployment](#-deployment)
4. [Scaling](#-scaling)
5. [Monitoring](#-monitoring)
6. [Security](#-security)
7. [Integration](#-integration)

---

## 🏢 Overview

Privora Enterprise provides:
- **Private Predictions**: FHE-encrypted market signals
- **Custom Categories**: Industry-specific taxonomies
- **API Access**: Programmatic integration
- **Analytics Dashboard**: Business intelligence
- **SLA Support**: 99.9% uptime guarantee

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
└────────────────────┬──────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐       ┌────▼────┐      ┌────▼────┐
│Frontend│       │Backend   │      │MongoDB  │
│(Static)│       │(API)    │      │(Replica │
│CDN     │       │         │      │Set)     │
└───┬───┘       └────┬────┘      └────┬────┘
    │                │                │
    │         ┌──────▼──────┐         │
    │         │Redis Cache  │         │
    │         │(Sessions)   │         │
    │         └──────┬──────┘         │
    │                │                │
    └────────────────┼────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           Blockchain Network            │
│         (Sepolia/Mainnet)               │
└─────────────────────────────────────────┘
```

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| Bandwidth | 100 Mbps | 1 Gbps |

---

## 🚀 Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=https://api.yourdomain.com
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "5002:5002"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/privora
      - REDIS_URL=redis://redis:6379
      - PRIVATE_KEY=${PRIVATE_KEY}
      - ALCHEMY_API_KEY=${ALCHEMY_API_KEY}
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  mongo-data:
  redis-data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: privora-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: privora-backend
  template:
    metadata:
      labels:
        app: privora-backend
    spec:
      containers:
      - name: backend
        image: privora/backend:latest
        ports:
        - containerPort: 5002
        envFrom:
        - secretRef:
            name: privora-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: privora-backend
spec:
  selector:
    app: privora-backend
  ports:
  - port: 5002
    targetPort: 5002
  type: ClusterIP
```

### Environment Variables

```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/privora
REDIS_URL=redis://localhost:6379
PRIVATE_KEY=0x... # Deployer wallet
ALCHEMY_API_KEY=your_alchemy_key
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Frontend (.env)
VITE_API_URL=https://api.privora.ai
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x...
```

---

## 📈 Scaling

### Horizontal Scaling

```nginx
upstream backend {
    least_conn;
    server backend1:5002 weight=3;
    server backend2:5002 weight=3;
    server backend3:5002 backup;
}
```

### Database Sharding

```javascript
// MongoDB sharding key
{
  "predictionId": "hashed",
  "createdAt": 1
}
```

### Caching Strategy

| Layer | TTL | Strategy |
|-------|-----|----------|
| Redis | 5 min | Prediction lists |
| Redis | 1 min | Analytics |
| CDN | 1 hour | Static assets |
| Browser | 5 min | API responses |

### Load Testing

```bash
# Using k6
k6 run --vus 100 --duration 30s script.js

# Using Artillery
artillery run --target https://api.privora.ai load-test.yml
```

---

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl https://api.privora.ai/health

# Database health
mongosh --eval "db.adminCommand('ping')"

# Redis health
redis-cli ping
```

### Metrics to Track

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Response Time | < 200ms | > 500ms |
| Error Rate | < 1% | > 5% |
| Database Connections | < 80% | > 90% |
| Memory Usage | < 70% | > 85% |

### Prometheus Configuration

```yaml
scrape_configs:
  - job_name: 'privora'
    static_configs:
      - targets: ['localhost:5002']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Key panels:
- Request rate
- Error rate
- Response time
- Database queries
- Active users
- Prediction volume

---

## 🔒 Security

### Network Security

```bash
# Firewall rules
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### SSL/TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256;
}
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### Audit Logging

```javascript
// Log all admin actions
{
  "timestamp": "2025-01-15T10:30:00Z",
  "userId": "0xABC...",
  "action": "CREATE_PREDICTION",
  "resourceId": 123,
  "ip": "192.168.1.1"
}
```

---

## 🔌 Integration

### REST API Integration

```javascript
const PrivoraAPI = require('privora-sdk');

const client = new PrivoraAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.privora.ai'
});

// List predictions
const predictions = await client.predictions.list({
  category: 'crypto',
  status: 'active'
});
```

### Webhook Integration

```javascript
// Register webhook
POST /api/webhooks
{
  "url": "https://yourapp.com/webhook",
  "events": ["prediction.resolved", "payout.processed"]
}
```

### Custom Domain Setup

```dns
# DNS Records
A     @        192.0.2.1
CNAME www      yourdomain.com
TXT   @        v=spf1 include:_spf.google.com ~all
```

### SSO Integration

```javascript
// OAuth2 configuration
{
  "issuer": "https://your-idp.com",
  "client_id": "privora",
  "client_secret": "...",
  "redirect_uri": "https://app.privora.ai/callback"
}
```

---

## 📚 Summary

Enterprise deployment checklist:
- ✅ Infrastructure provisioned
- ✅ SSL certificates installed
- ✅ Environment variables configured
- ✅ Database initialized
- ✅ Monitoring configured
- ✅ Security hardening applied
- ✅ Backup strategy implemented

For technical details, see:
- **Technical Architecture:** [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
- **API Reference:** [API_REFERENCE.md](API_REFERENCE.md)