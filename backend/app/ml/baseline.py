from datetime import datetime, timezone
from typing import Dict, List, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest


class DeviceFeatureVector:
    def __init__(self, hour_of_day: int, open_ports_count: int, response_time_ms: float, has_new_port: int):
        self.hour_of_day = hour_of_day
        self.open_ports_count = open_ports_count
        self.response_time_ms = response_time_ms
        self.has_new_port = has_new_port

    def to_array(self) -> List[float]:
        return [
            float(self.hour_of_day),
            float(self.open_ports_count),
            float(self.response_time_ms),
            float(self.has_new_port),
        ]


class DeviceBaselineTracker:
    """Tracks historical statistical baselines for devices and trains Isolation Forest anomaly models."""

    def __init__(self):
        # device_id -> list of historical features
        self.history: Dict[str, List[List[float]]] = {}
        # device_id -> baseline set of known ports
        self.baseline_ports: Dict[str, set] = {}
        # device_id -> trained IsolationForest
        self.models: Dict[str, IsolationForest] = {}

    def log_observation(
        self,
        device_id: str,
        open_ports: List[int],
        response_time_ms: float,
        timestamp: datetime,
    ) -> Tuple[bool, float]:
        """Logs a device telemetry observation and evaluates whether it represents an anomaly."""
        current_ports = set(open_ports)

        # Initialize baseline ports if first time seen
        if device_id not in self.baseline_ports:
            self.baseline_ports[device_id] = current_ports
            has_new_port = 0
        else:
            # Check if an unexpected new port appeared
            new_ports = current_ports - self.baseline_ports[device_id]
            has_new_port = 1 if len(new_ports) > 0 else 0
            # Update baseline
            self.baseline_ports[device_id].update(current_ports)

        vector = DeviceFeatureVector(
            hour_of_day=timestamp.hour,
            open_ports_count=len(open_ports),
            response_time_ms=response_time_ms,
            has_new_port=has_new_port,
        ).to_array()

        if device_id not in self.history:
            self.history[device_id] = []
        self.history[device_id].append(vector)

        # If we have at least 10 historical samples, train or evaluate with Isolation Forest
        if len(self.history[device_id]) >= 10:
            if device_id not in self.models:
                self.train_model(device_id)

            model = self.models.get(device_id)
            if model:
                pred = model.predict([vector])[0]  # -1 = anomaly, 1 = normal
                score = float(model.decision_function([vector])[0])
                is_anomaly = (pred == -1) or (has_new_port == 1)
                return is_anomaly, score

        # Statistical heuristic if under 10 samples
        is_anomaly = (has_new_port == 1)
        return is_anomaly, 0.0

    def train_model(self, device_id: str):
        """Fits an Isolation Forest on historical observations for the device."""
        samples = np.array(self.history[device_id])
        model = IsolationForest(
            n_estimators=50,
            contamination=0.05,
            random_state=42,
        )
        model.fit(samples)
        self.models[device_id] = model


baseline_tracker = DeviceBaselineTracker()
