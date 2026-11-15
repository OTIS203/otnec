import { Alert, Device, Network, NetworkMetric, DNSQueryLog, FilterPolicy, DNSStats } from "@/types";

const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = (
  rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`
).replace(/\/+$/, "");

export async function fetchNetworks(): Promise<Network[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/networks`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/alerts`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchMetrics(networkId: string): Promise<NetworkMetric[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metrics/${networkId}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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

export async function fetchDNSLogs(params?: {
  client_ip?: string;
  category?: string;
  is_blocked?: boolean;
}): Promise<DNSQueryLog[]> {
  try {
    const queryParts: string[] = [];
    if (params?.client_ip) queryParts.push(`client_ip=${encodeURIComponent(params.client_ip)}`);
    if (params?.category && params.category !== "all") queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.is_blocked !== undefined) queryParts.push(`is_blocked=${params.is_blocked}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

    const res = await fetch(`${API_BASE_URL}/api/v1/filtering/logs${qs}`);
    if (!res.ok) throw new Error("Failed to fetch logs");
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchFilterPolicy(): Promise<FilterPolicy | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/filtering/policies`);
    if (!res.ok) throw new Error("Failed to fetch policies");
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateFilterPolicy(update: Partial<FilterPolicy>): Promise<FilterPolicy | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/filtering/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error("Failed to update policy");
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDNSStats(): Promise<DNSStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/filtering/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return await res.json();
  } catch {
    return {
      total_queries: 0,
      blocked_queries: 0,
      social_queries: 0,
      allowed_queries: 0,
      top_social_apps: [],
      top_devices: [],
    };
  }
}
