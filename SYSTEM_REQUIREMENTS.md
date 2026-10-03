# PXT Smart Infrastructure — System Requirements

## Local Host Deployment Requirements
- **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), or macOS 12+
- **RAM**: Minimum 4 GB, Recommended 8 GB
- **CPU**: Dual-core 2.0 GHz or higher
- **Disk Space**: 500 MB free space
- **Python**: Version 3.10 to 3.13
- **Node.js**: Version 18.0 to 24.x
- **npm**: Version 9.0+

## Port Allocations
- `1883`: MQTT TCP Broker Port
- `9001`: MQTT WebSockets Port
- `8000`: FastAPI Backend Engine REST & WS Port
- `5173`: React SCADA Control Center Dev Server
- `80`: NGINX Production Web Server (Docker mode)
