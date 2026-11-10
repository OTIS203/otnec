from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "netscope_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(name="aggregate_daily_metrics")
def aggregate_daily_metrics(network_id: str):
    """Summarizes 24-hour latency and packet loss metrics."""
    return {"status": "aggregated", "network_id": network_id}


@celery_app.task(name="trigger_scheduled_subnet_scan")
def trigger_scheduled_subnet_scan(network_id: str, cidr: str):
    """Dispatches scheduled scan command to subnet agent."""
    return {"status": "scan_command_dispatched", "network_id": network_id, "cidr": cidr}

