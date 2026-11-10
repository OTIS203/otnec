import { Alert, Device, Network, NetworkMetric } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Deterministic ISO Timestamps for Zero-Mismatch SSR Hydration
const BASE_TIMESTAMP = "2026-11-10T12:00:00.000Z";

export const MOCK_NETWORK: Network = {
  id: "net-demo-01",
  name: "Home Office Subnet",
  cidr_v4: "192.168.1.0/24",
  gateway_ip: "192.168.1.1",
  security_score: 82,
  created_at: BASE_TIMESTAMP,
};

export const MOCK_DEVICES: Device[] = [
  {
    id: "dev-1",
    network_id: "net-demo-01",
    ip_address: "192.168.1.1",
    mac_address: "00:00:0c:12:34:56",
    hostname: "router.lan",
    vendor: "Cisco Systems",
    device_type: "router",
    os_guess: "Embedded Linux / Network OS",
    custom_name: "Main Gateway",
    trust_level: "trusted",
    is_online: true,
    response_time_ms: 1.2,
    first_seen_at: "2026-11-03T08:00:00.000Z",
    last_seen_at: BASE_TIMESTAMP,
    ports: [
      { id: "p1", port: 80, protocol: "tcp", service_name: "http", banner: "Router Web GUI", is_risky: false },
      { id: "p2", port: 53, protocol: "tcp", service_name: "dns", is_risky: false },
      { id: "p3", port: 443, protocol: "tcp", service_name: "https", is_risky: false },
    ],
  },
  {
    id: "dev-2",
    network_id: "net-demo-01",
    ip_address: "192.168.1.105",
    mac_address: "f4:f5:d8:aa:bb:cc",
    hostname: "MacBook-Pro.local",
    vendor: "Apple",
    device_type: "pc",
    os_guess: "macOS Sonoma",
    custom_name: "Workstation",
    trust_level: "trusted",
    is_online: true,
    response_time_ms: 2.4,
    first_seen_at: "2026-11-05T09:30:00.000Z",
    last_seen_at: BASE_TIMESTAMP,
    ports: [
      { id: "p4", port: 22, protocol: "tcp", service_name: "ssh", banner: "OpenSSH 9.6", is_risky: false },
    ],
  },
  {
    id: "dev-3",
    network_id: "net-demo-01",
    ip_address: "192.168.1.150",
    mac_address: "44:19:b6:99:88:77",
    hostname: "cam-backyard",
    vendor: "Hangzhou Hikvision",
    device_type: "camera",
    os_guess: "Embedded Linux",
    custom_name: "Backyard Security Camera",
    trust_level: "quarantined",
    is_online: true,
    response_time_ms: 4.1,
    first_seen_at: "2026-11-08T14:15:00.000Z",
    last_seen_at: BASE_TIMESTAMP,
    ports: [
      { id: "p5", port: 23, protocol: "tcp", service_name: "telnet", banner: "BusyBox v1.22 telnetd", is_risky: true },
      { id: "p6", port: 554, protocol: "tcp", service_name: "rtsp", banner: "RTSP/1.0 H.264 Stream", is_risky: false },
    ],
  },
  {
    id: "dev-4",
    network_id: "net-demo-01",
    ip_address: "192.168.1.180",
    mac_address: "b0:a7:37:11:22:33",
    hostname: "Roku-Ultra",
    vendor: "Roku Inc.",
    device_type: "smart_tv",
    os_guess: "Roku OS",
    custom_name: "Living Room TV",
    trust_level: "guest",
    is_online: true,
    response_time_ms: 3.5,
    first_seen_at: "2026-10-31T18:00:00.000Z",
    last_seen_at: BASE_TIMESTAMP,
    ports: [
      { id: "p7", port: 8060, protocol: "tcp", service_name: "http", banner: "Roku ECP REST", is_risky: false },
    ],
  },
  {
    id: "dev-5",
    network_id: "net-demo-01",
    ip_address: "192.168.1.210",
    mac_address: "24:0a:c4:44:55:66",
    hostname: "espressif-plug",
    vendor: "Espressif Inc.",
    device_type: "iot",
    os_guess: "FreeRTOS",
    custom_name: "Smart Power Plug",
    trust_level: "unknown",
    is_online: false,
    response_time_ms: 0,
    first_seen_at: "2026-10-28T11:00:00.000Z",
    last_seen_at: "2026-11-10T08:00:00.000Z",
    ports: [],
  },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: "alt-1",
    network_id: "net-demo-01",
    device_id: "dev-3",
    severity: "critical",
    category: "risky_port",
    title: "Unencrypted Telnet Port Open (Port 23)",
    description: "Host 192.168.1.150 (Backyard Security Camera) has port 23 exposed. Credentials can be intercepted in cleartext.",
    is_acknowledged: false,
    created_at: "2026-11-10T10:00:00.000Z",
  },
  {
    id: "alt-2",
    network_id: "net-demo-01",
    severity: "warning",
    category: "new_device",
    title: "Unknown Smart Plug Detected",
    description: "Device with Espressif MAC 24:0a:c4:44:55:66 joined the network with trust tier 'unknown'.",
    is_acknowledged: false,
    created_at: "2026-11-10T07:00:00.000Z",
  },
];

export const MOCK_METRICS: NetworkMetric[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `metric-${i}`,
  network_id: "net-demo-01",
  recorded_at: `2026-11-10T${String(i).padStart(2, "0")}:00:00.000Z`,
  latency_ms: 12.5 + Math.sin(i) * 3,
  jitter_ms: 1.8 + Math.cos(i) * 0.8,
  packet_loss_pct: i === 14 ? 2.5 : 0.0,
  dns_rtt_ms: 8.0 + Math.sin(i * 0.5) * 2,
}));

export async function fetchNetworks(): Promise<Network[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/networks`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.length > 0 ? data : [MOCK_NETWORK];
  } catch {
    return [MOCK_NETWORK];
  }
}

export async function fetchDevices(networkId?: string): Promise<Device[]> {
  try {
    const url = networkId
      ? `${API_BASE_URL}/api/v1/devices?network_id=${networkId}`
      : `${API_BASE_URL}/api/v1/devices`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.length > 0 ? data : MOCK_DEVICES;
  } catch {
    return MOCK_DEVICES;
  }
}

export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/alerts`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.length > 0 ? data : MOCK_ALERTS;
  } catch {
    return MOCK_ALERTS;
  }
}

export async function fetchMetrics(networkId: string): Promise<NetworkMetric[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metrics/${networkId}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.length > 0 ? data : MOCK_METRICS;
  } catch {
    return MOCK_METRICS;
  }
}

export async function wakeOnLan(deviceId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}/wol`, { method: "POST" });
}

export async function updateDevice(
  deviceId: string,
  update: { custom_name?: string; trust_level?: string }
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
}
