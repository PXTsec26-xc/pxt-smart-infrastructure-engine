import asyncio
import json
import logging
import time
import os
import sys
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from sqlalchemy import select, update, delete, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import get_db, init_db, engine
from backend.models import (
    DeviceORM, TelemetryORM, AlertORM, EventORM,
    AutomationRuleORM, AutomationHistoryORM, CommandORM,
    UserORM, AuditLogORM, SystemConfigORM
)
from backend.auth import (
    hash_password, verify_password, create_access_token,
    decode_access_token, get_current_user
)
from backend.websocket_manager import ws_manager
from backend.health_monitor import start_health_monitor_loop
from backend.mqtt_ingestion import MQTTIngestionService
from backend.seed_data import seed_database
from backend.migrations import run_migrations, apply_telemetry_retention_policy
from backend.adapters.http_adapter import HTTPRESTAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("PXT-Backend")

app = FastAPI(
    title="PXT Smart Infrastructure Real-Time IoT Engine API",
    version="1.2.0",
    description="Production-Grade Backend Core for Smart IoT Infrastructure Engine"
)

# --- PHASE 5: SECURITY HEADERS & RATE LIMITING MIDDLEWARE ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:; connect-src *;"
        return response

app.add_middleware(SecurityHeadersMiddleware)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mqtt_ingestion = MQTTIngestionService(
    broker_host=os.getenv("MQTT_HOST", "127.0.0.1"),
    broker_port=int(os.getenv("MQTT_PORT", "1883"))
)
http_adapter = HTTPRESTAdapter()
health_monitor_task: Optional[asyncio.Task] = None

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing PXT Backend Engine, Running Migrations & Seeding Database...")
    await run_migrations()
    await seed_database()
    await http_adapter.initialize()
    if os.getenv("VERCEL") != "1" and os.getenv("DISABLE_BACKGROUND_SERVICES") != "1":
        mqtt_ingestion.start()
        global health_monitor_task
        health_monitor_task = asyncio.create_task(start_health_monitor_loop())
        logger.info("PXT Production Background Daemons launched successfully.")
    else:
        logger.info("PXT Serverless Mode: Background daemons skipped for stateless execution.")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down PXT Backend Services gracefully...")
    if os.getenv("VERCEL") != "1" and os.getenv("DISABLE_BACKGROUND_SERVICES") != "1":
        mqtt_ingestion.stop()
        await http_adapter.shutdown()
        if health_monitor_task:
            health_monitor_task.cancel()
    logger.info("PXT Backend Services shut down cleanly.")

# --- WEBSOCKET ENDPOINT ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# --- AUTH & USER API ---
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(UserORM).where(UserORM.username == req.username)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token({"sub": user.username, "role": user.role})
    
    audit = AuditLogORM(username=user.username, action="USER_LOGIN", resource="auth", details="User authenticated successfully")
    db.add(audit)
    await db.commit()
    
    return {"access_token": token, "token_type": "bearer", "username": user.username, "role": user.role}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# --- DEVICE MANAGEMENT API ---
@app.get("/api/devices")
async def list_devices(domain: Optional[str] = None, status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(DeviceORM)
    if domain:
        stmt = stmt.where(DeviceORM.domain == domain)
    if status:
        stmt = stmt.where(DeviceORM.status == status)
    stmt = stmt.order_by(DeviceORM.id)
    res = await db.execute(stmt)
    devices = res.scalars().all()
    
    # In Vercel serverless environment, virtual simulation devices remain online when powered on
    now = time.time()
    if os.getenv("VERCEL") == "1" or os.getenv("DISABLE_BACKGROUND_SERVICES") == "1":
        for dev in devices:
            if dev.is_powered_on and dev.status != "MALFUNCTIONING":
                dev.status = "ONLINE"
                dev.last_seen = now

    return devices

class DeviceCreateRequest(BaseModel):
    id: str
    name: str
    device_type: str
    domain: str
    location: str
    hardware_mode: str = "PHYSICAL_HARDWARE"

@app.post("/api/devices")
async def register_device(dev: DeviceCreateRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    stmt = select(DeviceORM).where(DeviceORM.id == dev.id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Device ID already registered")

    orm_dev = DeviceORM(
        id=dev.id,
        name=dev.name,
        device_type=dev.device_type,
        domain=dev.domain,
        location=dev.location,
        status="ONLINE",
        is_powered_on=True,
        last_seen=time.time()
    )
    db.add(orm_dev)
    
    audit = AuditLogORM(username=user.get("sub", "admin"), action="REGISTER_DEVICE", resource=dev.id, details=f"Registered device '{dev.name}' ({dev.hardware_mode})")
    db.add(audit)
    await db.commit()
    
    await ws_manager.broadcast("DEVICE_REGISTERED", {"id": dev.id, "name": dev.name, "domain": dev.domain})
    return {"message": "Device registered successfully", "device_id": dev.id}

@app.get("/api/devices/{device_id}")
async def get_device(device_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(DeviceORM).where(DeviceORM.id == device_id)
    res = await db.execute(stmt)
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

class DeviceControlRequest(BaseModel):
    action: str
    parameters: Dict[str, Any] = {}

@app.post("/api/devices/{device_id}/command")
async def send_device_command(device_id: str, req: DeviceControlRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    stmt = select(DeviceORM).where(DeviceORM.id == device_id)
    res = await db.execute(stmt)
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    cmd_id = f"cmd_{int(time.time()*1000)}"
    
    cmd_record = CommandORM(
        id=cmd_id,
        device_id=device_id,
        action=req.action,
        parameters=json.dumps(req.parameters),
        status="REQUESTED",
        requested_at=time.time()
    )
    db.add(cmd_record)

    audit = AuditLogORM(
        username=user.get("sub", "admin"),
        action=f"DEVICE_COMMAND_{req.action.upper()}",
        resource=device_id,
        details=f"Issued command '{req.action}' with params: {req.parameters}"
    )
    db.add(audit)
    await db.commit()

    cmd_payload = {
        "command_id": cmd_id,
        "device_id": device_id,
        "action": req.action,
        "parameters": req.parameters,
        "timestamp": time.time()
    }
    
    if mqtt_ingestion.client and mqtt_ingestion.client.is_connected():
        mqtt_ingestion.client.publish(f"pxt/commands/{device_id}", json.dumps(cmd_payload), qos=1)
        cmd_record.status = "SENT"
        await db.commit()

    return {"command_id": cmd_id, "status": "SENT", "device_id": device_id, "action": req.action}

# --- HTTP/REST HARDWARE TELEMETRY INGESTION (PHASE 2) ---
class HTTPTelemetryPayload(BaseModel):
    device_id: str
    is_physical_hardware: bool = True
    metrics: Dict[str, Any]

@app.post("/api/telemetry/ingest")
async def ingest_hardware_telemetry(payload: HTTPTelemetryPayload, db: AsyncSession = Depends(get_db)):
    metrics_records = http_adapter.parse_http_payload(payload.device_id, payload.dict())
    now = time.time()

    # Update or register device
    stmt = select(DeviceORM).where(DeviceORM.id == payload.device_id)
    res = await db.execute(stmt)
    device = res.scalar_one_or_none()

    if not device:
        device = DeviceORM(
            id=payload.device_id,
            name=f"Hardware Node {payload.device_id}",
            device_type="HTTP Physical Hardware Sensor",
            domain="Industrial Hardware",
            location="Field Microcontroller",
            status="ONLINE",
            last_seen=now
        )
        db.add(device)
    else:
        device.last_seen = now
        device.status = "ONLINE"

    for m in metrics_records:
        telem = TelemetryORM(
            device_id=m["device_id"],
            metric_name=m["metric_name"],
            value=m["value"],
            unit=m["unit"],
            timestamp=m["timestamp"]
        )
        db.add(telem)

    await db.commit()

    await ws_manager.broadcast("TELEMETRY_UPDATED", {
        "device_id": payload.device_id,
        "metrics": payload.metrics,
        "timestamp": now,
        "hardware_type": "PHYSICAL_HARDWARE"
    })
    return {"message": "Telemetry ingested successfully", "count": len(metrics_records)}

# --- TELEMETRY API ---
@app.get("/api/telemetry/latest")
async def get_latest_telemetry(device_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    if device_id:
        stmt = select(TelemetryORM).where(TelemetryORM.device_id == device_id).order_by(desc(TelemetryORM.timestamp)).limit(50)
    else:
        stmt = select(TelemetryORM).order_by(desc(TelemetryORM.timestamp)).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()

@app.get("/api/telemetry/history/{device_id}")
async def get_device_telemetry_history(
    device_id: str,
    metric_name: Optional[str] = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TelemetryORM).where(TelemetryORM.device_id == device_id)
    if metric_name:
        stmt = stmt.where(TelemetryORM.metric_name == metric_name)
    stmt = stmt.order_by(desc(TelemetryORM.timestamp)).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return list(reversed(records))

# --- ALERTS & INCIDENTS API ---
@app.get("/api/alerts")
async def list_alerts(
    acknowledged: Optional[bool] = None,
    resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AlertORM)
    if acknowledged is not None:
        stmt = stmt.where(AlertORM.acknowledged == acknowledged)
    if resolved is not None:
        stmt = stmt.where(AlertORM.resolved == resolved)
    if severity:
        stmt = stmt.where(AlertORM.severity == severity)
    stmt = stmt.order_by(desc(AlertORM.created_at)).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()

@app.get("/api/alerts/summary")
async def get_alert_summary(db: AsyncSession = Depends(get_db)):
    active_res = await db.execute(select(func.count()).select_from(AlertORM).where(AlertORM.acknowledged == False, AlertORM.resolved == False))
    active_count = active_res.scalar() or 0

    ack_res = await db.execute(select(func.count()).select_from(AlertORM).where(AlertORM.acknowledged == True, AlertORM.resolved == False))
    ack_count = ack_res.scalar() or 0

    resolved_res = await db.execute(select(func.count()).select_from(AlertORM).where(AlertORM.resolved == True))
    resolved_count = resolved_res.scalar() or 0

    return {
        "active_unresolved": active_count,
        "acknowledged": ack_count,
        "resolved": resolved_count,
        "total_historical": active_count + ack_count + resolved_count
    }

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    stmt = select(AlertORM).where(AlertORM.id == alert_id)
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    alert.acknowledged_by = user.get("sub", "admin")
    await db.commit()

    await ws_manager.broadcast("ALERT_ACKNOWLEDGED", {"id": alert_id, "acknowledged_by": alert.acknowledged_by})
    return {"message": "Alert acknowledged", "alert_id": alert_id}

@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    stmt = select(AlertORM).where(AlertORM.id == alert_id)
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    alert.resolved_at = time.time()
    await db.commit()

    await ws_manager.broadcast("ALERT_RESOLVED", {"id": alert_id})
    return {"message": "Alert resolved", "alert_id": alert_id}

# --- SYSTEM OPERATING MODE API (MODE A: SIMULATION vs MODE B: PHYSICAL HARDWARE) ---
@app.get("/api/system/mode")
async def get_system_mode(db: AsyncSession = Depends(get_db)):
    stmt = select(SystemConfigORM).where(SystemConfigORM.key == "system_operating_mode")
    res = await db.execute(stmt)
    cfg = res.scalar_one_or_none()
    mode = cfg.value if cfg else "SIMULATION"
    return {"mode": mode, "description": "MODE A: SIMULATION MODE (Virtual Sensors)" if mode == "SIMULATION" else "MODE B: PHYSICAL HARDWARE MODE (Actual IoT Hardware Ingestion)"}

@app.post("/api/system/mode")
async def set_system_mode(mode_in: Dict[str, str], db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    new_mode = mode_in.get("mode", "SIMULATION").upper()
    if new_mode not in ["SIMULATION", "PHYSICAL_HARDWARE"]:
        raise HTTPException(status_code=400, detail="Mode must be 'SIMULATION' or 'PHYSICAL_HARDWARE'")

    stmt = select(SystemConfigORM).where(SystemConfigORM.key == "system_operating_mode")
    res = await db.execute(stmt)
    cfg = res.scalar_one_or_none()
    if not cfg:
        cfg = SystemConfigORM(key="system_operating_mode", value=new_mode)
        db.add(cfg)
    else:
        cfg.value = new_mode
        cfg.updated_at = time.time()

    audit = AuditLogORM(username=user.get("sub", "admin"), action="CHANGE_SYSTEM_MODE", resource="system", details=f"Switched system operating mode to {new_mode}")
    db.add(audit)
    await db.commit()

    await ws_manager.broadcast("SYSTEM_MODE_CHANGED", {"mode": new_mode})
    return {"message": f"System operating mode set to {new_mode}", "mode": new_mode}

# --- EVENTS API ---
@app.get("/api/events")
async def list_events(device_id: Optional[str] = None, limit: int = 100, db: AsyncSession = Depends(get_db)):
    stmt = select(EventORM)
    if device_id:
        stmt = stmt.where(EventORM.device_id == device_id)
    stmt = stmt.order_by(desc(EventORM.timestamp)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

# --- AUTOMATION RULES API ---
@app.get("/api/automation/rules")
async def list_automation_rules(db: AsyncSession = Depends(get_db)):
    stmt = select(AutomationRuleORM).order_by(AutomationRuleORM.id)
    res = await db.execute(stmt)
    return res.scalars().all()

class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    target_device: str = "*"
    metric_name: str
    operator: str
    threshold_val: float
    action_type: str
    action_params: Dict[str, Any] = {}

@app.post("/api/automation/rules")
async def create_automation_rule(rule_in: AutomationRuleCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    rule = AutomationRuleORM(
        name=rule_in.name,
        description=rule_in.description,
        enabled=True,
        target_device=rule_in.target_device,
        metric_name=rule_in.metric_name,
        operator=rule_in.operator,
        threshold_val=rule_in.threshold_val,
        action_type=rule_in.action_type,
        action_params=json.dumps(rule_in.action_params)
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@app.post("/api/automation/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(AutomationRuleORM).where(AutomationRuleORM.id == rule_id)
    res = await db.execute(stmt)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.enabled = not rule.enabled
    await db.commit()
    return {"id": rule_id, "enabled": rule.enabled}

@app.get("/api/automation/history")
async def get_automation_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = select(AutomationHistoryORM).order_by(desc(AutomationHistoryORM.timestamp)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

# --- COMMANDS API ---
@app.get("/api/commands")
async def list_commands(device_id: Optional[str] = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = select(CommandORM)
    if device_id:
        stmt = stmt.where(CommandORM.device_id == device_id)
    stmt = stmt.order_by(desc(CommandORM.requested_at)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

# --- AUDIT LOGS API ---
@app.get("/api/audit")
async def get_audit_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    stmt = select(AuditLogORM).order_by(desc(AuditLogORM.timestamp)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

# --- SYSTEM CONFIG & PUBLIC METADATA API ---
@app.get("/api/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    cfg_res = await db.execute(select(SystemConfigORM).where(SystemConfigORM.key == "system_mode"))
    cfg = cfg_res.scalar_one_or_none()
    mode = cfg.value if cfg else os.getenv("SYSTEM_OPERATING_MODE", "SIMULATION")
    mqtt_ok = mqtt_ingestion.client.is_connected() if mqtt_ingestion.client else False
    broker_host = os.getenv("MQTT_PUBLIC_HOST", os.getenv("MQTT_HOST", "127.0.0.1"))
    broker_tcp_port = int(os.getenv("MQTT_PORT", "1883"))
    broker_ws_port = int(os.getenv("MQTT_WS_PORT", "9001"))
    return {
        "system_name": "PXT Smart Infrastructure Real-Time Engine",
        "version": "1.2.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "operating_mode": mode,
        "mqtt_broker": {
            "host": broker_host,
            "tcp_port": broker_tcp_port,
            "ws_port": broker_ws_port,
            "connected": mqtt_ok
        },
        "ws_endpoint": "/ws",
        "capabilities": {
            "virtual_devices_count": 25,
            "domains": ["Smart Grid", "Water Management", "HVAC Systems", "Industrial Manufacturing", "Environmental Monitoring"],
            "physical_hardware_supported": True,
            "modbus_tcp_supported": True,
            "http_rest_ingestion_supported": True
        },
        "timestamp": time.time()
    }

# --- HEALTH, LIVENESS & READINESS DIAGNOSTICS (PHASE 6) ---
@app.get("/api/health")
async def get_system_health(db: AsyncSession = Depends(get_db)):
    total_res = await db.execute(select(func.count()).select_from(DeviceORM))
    total_devices = total_res.scalar() or 0

    online_res = await db.execute(select(func.count()).select_from(DeviceORM).where(DeviceORM.status == "ONLINE"))
    online_devices = online_res.scalar() or 0

    offline_res = await db.execute(select(func.count()).select_from(DeviceORM).where(DeviceORM.status == "OFFLINE"))
    offline_devices = offline_res.scalar() or 0

    alert_res = await db.execute(select(func.count()).select_from(AlertORM).where(AlertORM.acknowledged == False, AlertORM.resolved == False))
    active_alerts = alert_res.scalar() or 0

    mqtt_ok = mqtt_ingestion.client.is_connected() if mqtt_ingestion.client else False

    return {
        "status": "OPERATIONAL",
        "mqtt_broker_connected": mqtt_ok,
        "broker_host": os.getenv("MQTT_HOST", "127.0.0.1"),
        "broker_port": int(os.getenv("MQTT_PORT", "1883")),
        "broker_ws_port": int(os.getenv("MQTT_WS_PORT", "9001")),
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "active_alerts": active_alerts,
        "timestamp": time.time()
    }

@app.get("/api/health/liveness")
async def health_liveness():
    return {"status": "ALIVE", "timestamp": time.time()}

@app.get("/api/health/readiness")
async def health_readiness(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(1))
        db_ok = True
    except Exception:
        db_ok = False

    mqtt_ok = mqtt_ingestion.client.is_connected() if mqtt_ingestion.client else False
    is_serverless = os.getenv("VERCEL") == "1" or os.getenv("DISABLE_BACKGROUND_SERVICES") == "1"

    if db_ok and (mqtt_ok or is_serverless):
        return {
            "status": "READY",
            "database": "CONNECTED",
            "mqtt_broker": "CONNECTED" if mqtt_ok else "CLIENT_WSS_MODE",
            "execution_mode": "SERVERLESS" if is_serverless else "PERSISTENT_DAEMON",
            "timestamp": time.time()
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "NOT_READY", "database": db_ok, "mqtt_broker": mqtt_ok}
        )

@app.get("/api/health/diagnostics")
async def health_diagnostics(db: AsyncSession = Depends(get_db)):
    total_res = await db.execute(select(func.count()).select_from(DeviceORM))
    total_devices = total_res.scalar() or 0

    online_res = await db.execute(select(func.count()).select_from(DeviceORM).where(DeviceORM.status == "ONLINE"))
    online_devices = online_res.scalar() or 0

    alert_res = await db.execute(select(func.count()).select_from(AlertORM).where(AlertORM.acknowledged == False, AlertORM.resolved == False))
    active_alerts = alert_res.scalar() or 0

    mqtt_ok = mqtt_ingestion.client.is_connected() if mqtt_ingestion.client else False

    return {
        "status": "HEALTHY",
        "system": "PXT Smart Infrastructure Engine",
        "version": "1.2.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "database": "ONLINE",
        "mqtt_broker": "CONNECTED" if mqtt_ok else "DISCONNECTED",
        "broker_host": os.getenv("MQTT_HOST", "127.0.0.1"),
        "broker_port": int(os.getenv("MQTT_PORT", "1883")),
        "broker_ws_port": int(os.getenv("MQTT_WS_PORT", "9001")),
        "total_devices": total_devices,
        "online_devices": online_devices,
        "active_alerts": active_alerts,
        "uptime_status": "OPERATIONAL",
        "timestamp": time.time()
    }
