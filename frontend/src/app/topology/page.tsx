"use client";

import React, { useEffect, useState } from "react";
import { Device } from "@/types";
import { MOCK_DEVICES, fetchDevices } from "@/lib/api";
import { NetworkTopology } from "@/components/topology/NetworkTopology";

export default function TopologyPage() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);

  useEffect(() => {
    async function load() {
      const data = await fetchDevices();
      setDevices(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Network Topology</h2>
        <p className="text-xs text-slate-400 mt-1">
          Visual network topology tree and relationship mapping.
        </p>
      </div>

      <NetworkTopology devices={devices} />
    </div>
  );
}

