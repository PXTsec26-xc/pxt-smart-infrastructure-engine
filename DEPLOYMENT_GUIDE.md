# PXT Smart Infrastructure — Production Deployment Guide

## 1. Local Machine Deployment (Development)
To run natively on a local host:

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Build or start Frontend
cd frontend && npm install && npm run build && cd ..

# 3. Boot full stack with unified runner
python start_system.py
```
- Dashboard: `http://localhost:5173`
- Backend API Docs: `http://127.0.0.1:8000/docs`
- MQTT Broker: `127.0.0.1:1883` (TCP) / `127.0.0.1:9001` (WS)

---

## 2. Public Cloud Deployment (Decoupled: Vercel + Render / Railway)

### Step 1: Deploy Backend & MQTT Broker (Render / Railway / Fly.io / VPS)
Deploy using the backend Dockerfile `Dockerfile.backend`:
- **Build Command:** Built automatically from `Dockerfile.backend`
- **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port 8000` (or `python start_system.py`)
- **Environment Variables:**
  - `HOST` = `0.0.0.0`
  - `PORT` = `8000`
  - `ALLOWED_ORIGINS` = `*`
  - `ENVIRONMENT` = `production`
  - `MQTT_BIND_HOST` = `0.0.0.0`
  - `MQTT_HOST` = `127.0.0.1`
  - `MQTT_PORT` = `1883`
  - `MQTT_WS_PORT` = `9001`

### Step 2: Deploy Frontend (Vercel / Netlify / Cloudflare Pages)
Connect the repository and set the root directory to `frontend`:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_BASE_URL` = `https://your-backend-service.onrender.com`
  - `VITE_WS_BASE_URL` = `wss://your-backend-service.onrender.com/ws`

---

## 3. Docker Containerized Production Deployment (Single Host / VM)
To deploy the full multi-service stack via Docker Compose:

```bash
docker-compose up --build -d
```

Services instantiated:
- `mqtt-broker` (Ports 1883 TCP, 9001 WS)
- `backend` (Port 8000 REST & WS)
- `simulator` (25 Autonomous Virtual Devices)
- `frontend` (Port 80 & 5173 NGINX Static Web Server)

---

## 4. In-App Dynamic Endpoint Switching
Public visitors can also supply any backend URL dynamically using the in-app **Connection Settings Modal** or query parameters without rebuilding the code:
- Example: `https://pxt-dashboard.vercel.app?api=https://pxt-backend.onrender.com&ws=wss://pxt-backend.onrender.com/ws`
