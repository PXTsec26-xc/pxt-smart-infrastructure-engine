# PXT Smart Infrastructure Engine — Deployment & Hosting Guide

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  
**Public Frontend Target**: `https://pxt-smart-infrastructure-engine.vercel.app/`  

---

## 1. Cloud Architecture & Hosting Strategy

The PXT Smart Infrastructure Engine is designed with separation of concerns:

```
[Public Visitor Browser]
        |
        +---> HTTPS ---> [Vercel Frontend CDN] (https://pxt-smart-infrastructure-engine.vercel.app)
        |                     |
        |                     v (REST / WSS)
        +---> WSS/HTTPS -> [Public Backend API & MQTT Service] (Koyeb / Render / Fly.io / VPS)
                                  |
                                  +---> [Async SQLite DB / TimescaleDB]
                                  +---> [25 Virtual Simulator Threads]
```

---

## 2. Frontend Deployment (Vercel)

### Configuration Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: `18.x` or `20.x`

### Environment Variables
Configure the following in the Vercel Project Dashboard (`Settings` -> `Environment Variables`):

| Variable Name | Required | Sample Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `https://pxt-backend.koyeb.app` | Public HTTPS URL of the backend API service |
| `VITE_WS_BASE_URL` | Yes | `wss://pxt-backend.koyeb.app/ws` | Public WSS URL of the WebSocket endpoint |

---

## 3. Backend & Broker Deployment (Render / Koyeb / Fly.io / VPS)

### Option A: Containerized Docker Deployment
Build and run using the provided production Docker assets:

```bash
docker-compose up -d --build
```

### Option B: Direct Python Service Deployment
```bash
pip install -r requirements.txt
python start_system.py
```

### Backend Environment Variables
Set the following in your backend container environment:

```env
HOST=0.0.0.0
PORT=8000
MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_WS_PORT=9001
SECRET_KEY=YOUR_PRODUCTION_HIGH_ENTROPY_SECRET_KEY_2026
ALLOWED_ORIGINS=https://pxt-smart-infrastructure-engine.vercel.app,http://localhost:5173
DATABASE_URL=sqlite+aiosqlite:///./pxt_iot.db
TELEMETRY_RETENTION_DAYS=30
HEARTBEAT_TIMEOUT_SECONDS=10
SYSTEM_OPERATING_MODE=SIMULATION
```

---

## 4. Free-Tier Cost Constraints & Limitations

- **Vercel Frontend**: Free Tier (Unlimited static CDN deployments, 100 GB bandwidth/month).
- **Backend Hosting (Koyeb / Render / Fly.io)**: Free Tier (512 MB RAM, 0.1 vCPU). Note: Free instances on some providers sleep after 15 minutes of inactivity; initial wake request takes 15–30 seconds.
- **Data Storage**: SQLite on persistent disk volume or cloud PostgreSQL.

---

## 5. Rollback Procedure

If a public release needs to be reverted:
1. **Frontend (Vercel)**: Navigate to `Deployments` tab in Vercel Dashboard, select the previous stable deployment, and click **Promote to Production**.
2. **Git Branch**: Execute `git revert HEAD` and push to `main`.
