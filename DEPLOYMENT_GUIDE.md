# PXT Smart Infrastructure — Production Deployment Guide

## 1. Local Machine Deployment (Development / Innovation Demo)
To launch natively on a local host:

```bash
# 1. Install Python & Node dependencies
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..

# 2. Boot system
python start_system.py
```

## 2. Docker Containerized Production Deployment
To deploy using Docker Compose:

```bash
docker-compose up --build -d
```

Services instantiated:
- `mqtt-broker` (Ports 1883 TCP, 9001 WS)
- `backend` (Port 8000 REST & WS)
- `simulator` (25 Virtual Devices)
- `frontend` (Port 80 NGINX Web Server)

## 3. Reverse Proxy & SSL Configuration (NGINX)
For production hosting with HTTPS, proxy traffic through NGINX to `127.0.0.1:8000` for API/WS and `127.0.0.1:5173` for frontend UI.
