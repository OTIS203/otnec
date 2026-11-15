"use client";

import React, { useEffect, useState } from "react";
import { Device } from "@/types";
import { fetchDevices } from "@/lib/api";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { HardDrive, RefreshCw } from "lucide-react";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDevices = async () => {
    setLoading(true);
    const data = await fetchDevices();
    setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Discovered Devices</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time physical hardware inventory discovered by your OTNET agent.
          </p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {devices.length === 0 && !loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">No Live Devices Discovered Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Waiting for live telemetry. Run the OTNET agent on your local machine to discover all connected PCs and phones.
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-w-lg mx-auto font-mono text-xs text-indigo-300 text-left">
            cd agent<br />
            .\netscope-agent.exe -server &quot;https://YOUR-BACKEND-URL&quot; -cidr 192.168.1.0/24
          </div>
        </div>
      ) : (
        <DeviceTable devices={devices} onRefresh={loadDevices} />
      )}
    </div>
  );
}
