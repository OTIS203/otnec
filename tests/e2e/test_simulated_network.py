import socket
import threading
import time
from app.models.entities import Alert, Device, DevicePort
from app.services.security_scanner import audit_open_ports
from app.services.security_score import calculate_security_score


def start_mock_service(host: str, port: int, banner: str, stop_event: threading.Event):
    """Starts a lightweight ephemeral TCP service that returns a mock banner."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((host, port))
    sock.listen(5)
    sock.settimeout(0.5)

    while not stop_event.is_set():
        try:
            conn, _ = sock.accept()
            conn.sendall(banner.encode("utf-8"))
            conn.close()
        except socket.timeout:
            continue
        except Exception:
            break
    sock.close()


def test_simulated_network_end_to_end():
    stop_event = threading.Event()

    # Spin up simulated ephemeral services
    threads = [
        threading.Thread(
            target=start_mock_service,
            args=("127.0.0.1", 52323, "Telnet service ready\r\n", stop_event),
        ),
        threading.Thread(
            target=start_mock_service,
            args=("127.0.0.1", 59100, "HP LaserJet Ready\r\n", stop_event),
        ),
    ]
    for t in threads:
        t.daemon = True
        t.start()

    time.sleep(0.2)

    try:
        # 1. Simulate discovered device models
        dev_camera = Device(
            ip_address="192.168.100.50",
            mac_address="44:19:b6:aa:bb:cc",
            hostname="front-camera",
            vendor="Hangzhou Hikvision",
            device_type="camera",
            trust_level="quarantined",
            is_online=True,
        )
        dev_camera.ports.append(
            DevicePort(port=23, protocol="tcp", service_name="telnet", is_risky=True)
        )

        dev_printer = Device(
            ip_address="192.168.100.75",
            mac_address="00:01:e6:11:22:33",
            hostname="office-printer",
            vendor="HP Inc.",
            device_type="printer",
            trust_level="trusted",
            is_online=True,
        )
        dev_printer.ports.append(
            DevicePort(port=9100, protocol="tcp", service_name="jetdirect", is_risky=False)
        )

        # 2. Run Security Auditing on discovered ports
        vulns = audit_open_ports(dev_camera.ip_address, dev_camera.mac_address, [23])
        assert len(vulns) == 1
        assert vulns[0].check_id == "RISK-TELNET"
        assert vulns[0].severity == "critical"

        # 3. Calculate Deterministic Security Score
        score = calculate_security_score([dev_camera, dev_printer], [])
        # Base 100 - 15 (Telnet) = 85
        assert score == 85

    finally:
        stop_event.set()
        for t in threads:
            t.join(timeout=1.0)

