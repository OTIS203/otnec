import { describe, expect, it } from "vitest";
import { MOCK_DEVICES, MOCK_NETWORK } from "../lib/api";

describe("Frontend Data & Model Verification", () => {
  it("validates mock network CIDR and score", () => {
    expect(MOCK_NETWORK.cidr_v4).toBe("192.168.1.0/24");
    expect(MOCK_NETWORK.security_score).toBeGreaterThanOrEqual(0);
    expect(MOCK_NETWORK.security_score).toBeLessThanOrEqual(100);
  });

  it("ensures mock devices contains a gateway router", () => {
    const router = MOCK_DEVICES.find((d) => d.device_type === "router");
    expect(router).toBeDefined();
    expect(router?.ip_address).toBe("192.168.1.1");
  });

  it("identifies risky ports on vulnerable devices", () => {
    const camera = MOCK_DEVICES.find((d) => d.device_type === "camera");
    expect(camera).toBeDefined();
    const riskyPort = camera?.ports.find((p) => p.is_risky);
    expect(riskyPort?.port).toBe(23);
  });
});
