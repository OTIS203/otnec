from datetime import datetime, timezone
from app.ml.baseline import DeviceBaselineTracker


def test_baseline_tracker_normal_behavior():
    tracker = DeviceBaselineTracker()
    now = datetime(2026, 11, 10, 14, 0, tzinfo=timezone.utc)

    # Log 15 normal observations (ports 80, 443, latency ~2.0ms)
    for _ in range(15):
        is_anomaly, _ = tracker.log_observation(
            device_id="dev-normal-01",
            open_ports=[80, 443],
            response_time_ms=2.0,
            timestamp=now,
        )

    # 16th normal observation should not be flagged
    is_anomaly, score = tracker.log_observation(
        device_id="dev-normal-01",
        open_ports=[80, 443],
        response_time_ms=2.2,
        timestamp=now,
    )
    assert is_anomaly is False


def test_baseline_tracker_new_port_anomaly():
    tracker = DeviceBaselineTracker()
    now = datetime(2026, 11, 10, 14, 0, tzinfo=timezone.utc)

    # Establish baseline with only port 80
    for _ in range(5):
        tracker.log_observation(
            device_id="dev-iot-01",
            open_ports=[80],
            response_time_ms=3.0,
            timestamp=now,
        )

    # Sudden appearance of port 23 (Telnet) or 4444 (Backdoor)
    is_anomaly, _ = tracker.log_observation(
        device_id="dev-iot-01",
        open_ports=[80, 23],
        response_time_ms=3.1,
        timestamp=now,
    )
    assert is_anomaly is True

