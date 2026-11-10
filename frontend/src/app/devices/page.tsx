"use client";

import React, { useEffect, useState } from "react";
import { Device } from "@/types";
import { MOCK_DEVICES, fetchDevices } from "@/lib/api";
import { DeviceTable } from "@/components/devices/DeviceTable";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);

  const loadDevices = async () => {
    const data = await fetchDevices();
    setDevices(data);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Discovered Devices</h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed hardware inventory, classification, trust tiers, and open ports.
        </p>
      </div>

      <DeviceTable devices={devices} onRefresh={loadDevices} />
    </div>
  );
}

