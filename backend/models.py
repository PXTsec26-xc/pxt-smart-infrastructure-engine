import time
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Index, ForeignKey
from backend.database import Base

class DeviceORM(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)
    domain = Column(String, nullable=False, index=True)
    location = Column(String, nullable=False)
    status = Column(String, nullable=False, default="OFFLINE", index=True)
    is_powered_on = Column(Boolean, default=True)
    last_seen = Column(Float, default=0.0)
    uptime = Column(Float, default=0.0)
    reconnect_count = Column(Integer, default=0)
    created_at = Column(Float, default=time.time)
    updated_at = Column(Float, default=time.time)

class TelemetryORM(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False, index=True)
    metric_name = Column(String, nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    timestamp = Column(Float, nullable=False, index=True)

    __table_args__ = (
        Index("idx_device_metric_time", "device_id", "metric_name", "timestamp"),
    )

class AlertORM(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False, index=True)
    severity = Column(String, nullable=False, index=True) # INFO, WARNING, CRITICAL
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(String, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    created_at = Column(Float, default=time.time, index=True)
    resolved_at = Column(Float, nullable=True)

class EventORM(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True) # STATUS_CHANGE, HEARTBEAT_RESTORED, RULE_TRIGGERED, ANOMALY
    message = Column(Text, nullable=False)
    timestamp = Column(Float, default=time.time, index=True)

class AutomationRuleORM(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, index=True)
    target_device = Column(String, nullable=False, default="*") # device_id or '*'
    metric_name = Column(String, nullable=False)
    operator = Column(String, nullable=False) # >, <, ==, >=, <=, !=
    threshold_val = Column(Float, nullable=False)
    action_type = Column(String, nullable=False) # RAISE_ALERT, SEND_COMMAND, CHANGE_STATUS
    action_params = Column(Text, nullable=False, default="{}") # JSON string
    trigger_count = Column(Integer, default=0)
    last_triggered = Column(Float, nullable=True)

class AutomationHistoryORM(Base):
    __tablename__ = "automation_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("automation_rules.id"), nullable=False, index=True)
    rule_name = Column(String, nullable=False)
    device_id = Column(String, nullable=False, index=True)
    condition_met = Column(String, nullable=False)
    action_executed = Column(String, nullable=False)
    result_message = Column(Text, nullable=False)
    timestamp = Column(Float, default=time.time, index=True)

class CommandORM(Base):
    __tablename__ = "commands"

    id = Column(String, primary_key=True) # UUID or cmd_timestamp
    device_id = Column(String, ForeignKey("devices.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    parameters = Column(Text, nullable=False, default="{}")
    status = Column(String, nullable=False, default="REQUESTED", index=True) # REQUESTED, SENT, ACKNOWLEDGED, FAILED, TIMED_OUT
    message = Column(Text, nullable=True)
    requested_at = Column(Float, default=time.time, index=True)
    acknowledged_at = Column(Float, nullable=True)

class UserORM(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="operator") # admin, operator
    created_at = Column(Float, default=time.time)

class AuditLogORM(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(Float, default=time.time, index=True)

class SystemConfigORM(Base):
    __tablename__ = "system_config"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(Float, default=time.time)
