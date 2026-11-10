export type DeviceType =
  | "unknown"
  | "pc"
  | "phone"
  | "iot"
  | "smart_tv"
  | "printer"
  | "router"
  | "server"
  | "camera";

export type TrustLevel = "unknown" | "trusted" | "guest" | "quarantined";

export interface DevicePort {
  id: string;
  port: number;
  protocol: string;
  service_name: string;
  banner?: string;
  is_risky: boolean;
}

export interface Device {
  id: string;
  network_id: string;
  mac_address?: string;
  ip_address: string;
  hostname?: string;
  vendor?: string;
  device_type: DeviceType;
  os_guess?: string;
  custom_name?: string;
  trust_level: TrustLevel;
  is_online: boolean;
  response_time_ms: number;
  first_seen_at: string;
  last_seen_at: string;
  ports: DevicePort[];
}

export interface Network {
  id: string;
  name: string;
  cidr_v4: string;
  gateway_ip?: string;
  security_score: number;
  created_at: string;
}

export interface Alert {
  id: string;
  network_id: string;
  device_id?: string;
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  description: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface NetworkMetric {
  id: string;
  network_id: string;
  recorded_at: string;
  latency_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
  dns_rtt_ms: number;
}

export interface DNSQueryLog {
  id: string;
  network_id: string;
  client_ip: string;
  client_hostname?: string;
  domain: string;
  category: string;
  service_name: string;
  is_blocked: boolean;
  query_type: string;
  queried_at: string;
}

export interface FilterPolicy {
  id: string;
  network_id: string;
  block_social_media: boolean;
  block_streaming: boolean;
  block_gaming: boolean;
  custom_blacklist: string[];
  custom_whitelist: string[];
  updated_at: string;
}

export interface DNSStats {
  total_queries: number;
  blocked_queries: number;
  social_queries: number;
  allowed_queries: number;
  top_social_apps: { name: string; count: number }[];
  top_devices: { ip: string; hostname: string; count: number }[];
}

