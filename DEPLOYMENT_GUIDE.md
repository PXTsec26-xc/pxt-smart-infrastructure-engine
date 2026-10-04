# PXT Smart Infrastructure — Production Deployment Guide (Vercel + Neon + TLS MQTT)

This guide documents the $0 zero-cost production architecture deployed on **Vercel** with **Neon Serverless PostgreSQL** for persistent relational storage and **TLS MQTT-over-WebSocket** for distributed telemetry.

---

## 1. Architecture Summary

| Component | Platform | Protocol / Transport | Purpose | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Dashboard** | Vercel Edge / CDN | HTTPS / HTTP/2 | React 18 SCADA & Digital Twin UI | $0 (Vercel Free Tier) |
| **Serverless REST API** | Vercel Functions (`/api/*`) | HTTPS ASGI | Stateless endpoints for devices, health, telemetry history, audit logs, commands | $0 (Vercel Free Tier) |
| **Database** | Neon PostgreSQL | `postgresql+asyncpg://` | Persistent storage with connection pooling & zero dormancy | $0 (Neon Free Tier) |
| **Real-Time Telemetry** | EMQX / Public Broker | `wss://` (TLS Port 8084) | Distributed MQTT-over-WebSocket topic stream (`pxt/sec26_prod/#`) | $0 (Free / Open Protocol) |
| **Digital Twin Engine** | In-Browser Physics Worker | Client-side TypeScript | Autonomous simulation for 25 IoT nodes; survives network/broker outages | $0 (Client-side) |

---

## 2. Deploying to Vercel

### Step 1: Push Repository to GitHub / GitLab
Ensure `vercel.json` and `api/index.py` are present in repository root.

### Step 2: Import Project in Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and select your repository.
2. Framework Preset: **Vite** (or Other).
3. Root Directory: `./` (Leave as repository root; `vercel.json` handles builds and routing).
4. Build Command: `cd frontend && npm install && npm run build` (defined in `vercel.json`).
5. Output Directory: `frontend/dist`.

### Step 3: Configure Environment Variables in Vercel Project Settings
Set the following environment variables in Vercel Dashboard (*Settings -> Environment Variables*):

```env
# Neon PostgreSQL Connection String (from Neon Console)
DATABASE_URL=postgres://neondb_owner:YOUR_PASSWORD@ep-xyz-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Vercel Runtime Indicator
VERCEL=1

# Security & CORS
ALLOWED_ORIGINS=*
SECRET_KEY=pxt-sec26-production-jwt-secret-key-32-chars-min
ENVIRONMENT=production

# MQTT Broker Configuration (Optional override; defaults to TLS WSS)
VITE_MQTT_BROKER_WSS=wss://broker.emqx.io:8084/mqtt
```

---

## 3. Database Setup & Automated Migrations (Neon PostgreSQL)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the Connection URI (*Pooled* or *Direct*).
3. To test or run migrations locally against Neon:
   ```bash
   export DATABASE_URL="postgres://neondb_owner:YOUR_PASS@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
   python backend/migrate_db.py
   ```
4. When deployed to Vercel, the FastAPI ASGI startup handler automatically invokes `run_migrations()` and `seed_database()` during initialization.

---

## 4. Local Development Deployment

To run the full stack locally with Python virtual environment:

```bash
# 1. Install dependencies
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 2. Run automated test suite
python run_tests.py

# 3. Start full stack runner
python start_system.py
```
- **Dashboard:** `http://localhost:5173`
- **Backend API Docs:** `http://127.0.0.1:8000/docs`
- **MQTT Broker:** `127.0.0.1:1883` (TCP) / `127.0.0.1:9001` (WS)

---

## 5. In-App Connectivity & Diagnostics Modal

Operators and visitors can inspect or adjust network endpoints dynamically at runtime without rebuilding the frontend:
- **Connection Pill:** Located in the top navigation bar with real-time status (`LIVE`, `DEGRADED`, `RECONNECTING`, `OFFLINE`).
- **Settings Modal:** Access by clicking the status pill. Allows testing REST API response latency, switching MQTT brokers, and triggering digital twin anomaly injections.
- **Query Parameter Overrides:**
  - `?api=https://your-custom-api.vercel.app`
  - `?mqtt=wss://broker.emqx.io:8084/mqtt`
