import json
import logging
import time
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import AutomationRuleORM, AutomationHistoryORM, AlertORM, EventORM
from backend.websocket_manager import ws_manager

logger = logging.getLogger("PXT-AutomationEngine")

def evaluate_condition(value: float, operator: str, threshold: float) -> bool:
    if operator == ">":
        return value > threshold
    elif operator == "<":
        return value < threshold
    elif operator == "==":
        return abs(value - threshold) < 1e-4
    elif operator == ">=":
        return value >= threshold
    elif operator == "<=":
        return value <= threshold
    elif operator == "!=":
        return abs(value - threshold) >= 1e-4
    return False

async def process_telemetry_rules(
    session: AsyncSession,
    device_id: str,
    metric_name: str,
    value: float,
    unit: str,
    mqtt_client=None
):
    try:
        stmt = select(AutomationRuleORM).where(
            AutomationRuleORM.enabled == True,
            AutomationRuleORM.metric_name == metric_name
        )
        result = await session.execute(stmt)
        rules = result.scalars().all()

        for rule in rules:
            if rule.target_device != "*" and rule.target_device != device_id:
                continue

            if evaluate_condition(value, rule.operator, rule.threshold_val):
                now = time.time()
                # Cooldown check: prevent rule spamming if triggered within 10 seconds
                if rule.last_triggered and (now - rule.last_triggered < 10.0):
                    continue

                rule.last_triggered = now
                rule.trigger_count = (rule.trigger_count or 0) + 1
                await session.flush()

                cond_str = f"{metric_name} ({value} {unit}) {rule.operator} {rule.threshold_val}"
                action_type = rule.action_type
                result_msg = f"Rule '{rule.name}' fired for device {device_id}: {cond_str}"

                # 1. Action: RAISE_ALERT
                if action_type == "RAISE_ALERT":
                    try:
                        params = json.loads(rule.action_params)
                    except Exception:
                        params = {}
                    severity = params.get("severity", "WARNING").upper()
                    alert = AlertORM(
                        device_id=device_id,
                        severity=severity,
                        title=f"Automation Alert: {rule.name}",
                        description=f"Rule '{rule.name}' triggered on device {device_id}. Value: {value} {unit} (Threshold: {rule.threshold_val})",
                        acknowledged=False,
                        created_at=now
                    )
                    session.add(alert)
                    await session.flush()

                    alert_data = {
                        "id": alert.id,
                        "device_id": device_id,
                        "severity": severity,
                        "title": alert.title,
                        "description": alert.description,
                        "acknowledged": False,
                        "created_at": now
                    }
                    await ws_manager.broadcast("ALERT_CREATED", alert_data)
                    result_msg += f" | Raised {severity} Alert #{alert.id}"

                # 2. Action: SEND_COMMAND
                elif action_type == "SEND_COMMAND":
                    try:
                        params = json.loads(rule.action_params)
                    except Exception:
                        params = {"action": "trigger_anomaly", "parameters": {"sensor": metric_name, "value": rule.threshold_val * 1.5}}
                    
                    cmd_action = params.get("action", "set_parameter")
                    cmd_params = params.get("parameters", {})
                    
                    cmd_payload = {
                        "command_id": f"rule_cmd_{int(now*1000)}",
                        "action": cmd_action,
                        "parameters": cmd_params
                    }
                    
                    if mqtt_client and mqtt_client.is_connected():
                        mqtt_client.publish(f"pxt/commands/{device_id}", json.dumps(cmd_payload), qos=1)
                        result_msg += f" | Published command '{cmd_action}' to device {device_id}"

                # 3. Action: CHANGE_STATUS
                elif action_type == "CHANGE_STATUS":
                    try:
                        params = json.loads(rule.action_params)
                    except Exception:
                        params = {"status": "DEGRADED"}
                    new_status = params.get("status", "DEGRADED")
                    event = EventORM(
                        device_id=device_id,
                        event_type="RULE_STATUS_CHANGE",
                        message=f"Rule '{rule.name}' set status to {new_status}",
                        timestamp=now
                    )
                    session.add(event)
                    result_msg += f" | Changed status to {new_status}"

                # Save automation execution history record
                history = AutomationHistoryORM(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    device_id=device_id,
                    condition_met=cond_str,
                    action_executed=action_type,
                    result_message=result_msg,
                    timestamp=now
                )
                session.add(history)
                await session.commit()

                await ws_manager.broadcast("AUTOMATION_TRIGGERED", {
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "device_id": device_id,
                    "condition": cond_str,
                    "result": result_msg,
                    "timestamp": now
                })
                logger.info(f"Automation Rule Triggered: {result_msg}")

    except Exception as e:
        logger.error(f"Error evaluating automation rules: {e}", exc_info=True)
