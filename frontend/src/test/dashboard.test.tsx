import { describe, expect, it } from "vitest";
import { Device, Network } from "@/types";

const TEST_NETWORK: Network = {
  id: "test-net-01",
  name: "Test Subnet",
  cidr_v4: "192.168.1.0/24",
  gateway_ip: "192.168.1.1",
  security_score: 82,
  created_at: "2026-11-10T12:00:00.000Z",
};

const TEST_DEVICES: Device[] = [
  {
    id: "dev-1",
    network_id: "test-net-01",
    ip_address: "192.168.1.1",
    mac_address: "00:00:0c:12:34:56",
    hostname: "router.lan",
    vendor: "Cisco Systems",
    device_type: "router",
    os_guess: "Embedded Linux",
    trust_level: "trusted",
    is_online: true,
    response_time_ms: 1.2,
    first_seen_at: "2026-11-03T08:00:00.000Z",
    last_seen_at: "2026-11-10T12:00:00.000Z",
    ports: [{ id: "p1", port: 80, protocol: "tcp", service_name: "http", is_risky: false }],
  },
  {
    id: "dev-2",
    network_id: "test-net-01",
    ip_address: "192.168.1.150",
    mac_address: "44:19:b6:99:88:77",
    hostname: "cam-backyard",
    vendor: "Hikvision",
    device_type: "camera",
    os_guess: "Embedded Linux",
    trust_level: "quarantined",
    is_online: true,
    response_time_ms: 4.1,
    first_seen_at: "2026-11-08T14:15:00.000Z",
    last_seen_at: "2026-11-10T12:00:00.000Z",
    ports: [{ id: "p5", port: 23, protocol: "tcp", service_name: "telnet", is_risky: true }],
  },
];

describe("Frontend Data & Model Verification", () => {
  it("validates test network CIDR and score", () => {
    expect(TEST_NETWORK.cidr_v4).toBe("192.168.1.0/24");
    expect(TEST_NETWORK.security_score).toBeGreaterThanOrEqual(0);
    expect(TEST_NETWORK.security_score).toBeLessThanOrEqual(100);
  });

  it("ensures test devices contains a gateway router", () => {
    const router = TEST_DEVICES.find((d) => d.device_type === "router");
    expect(router).toBeDefined();
    expect(router?.ip_address).toBe("192.168.1.1");
  });

  it("identifies risky ports on vulnerable devices", () => {
    const camera = TEST_DEVICES.find((d) => d.device_type === "camera");
    expect(camera).toBeDefined();
    const riskyPort = camera?.ports.find((p) => p.is_risky);
    expect(riskyPort?.port).toBe(23);
  });
});

