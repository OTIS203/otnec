"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  HardDrive,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Alert, Device, Network, NetworkMetric } from "@/types";
import {
  MOCK_ALERTS,
  MOCK_DEVICES,
  MOCK_METRICS,
  MOCK_NETWORK,
  fetchAlerts,
  fetchDevices,
  fetchMetrics,
  fetchNetworks,
} from "@/lib/api";
import { SecurityScoreGauge } from "@/components/dashboard/SecurityScoreGauge";
import { HealthChart } from "@/components/dashboard/HealthChart";

export default function DashboardPage() {
  const [network, setNetwork] = useState<Network>(MOCK_NETWORK);
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [metrics, setMetrics] = useState<NetworkMetric[]>(MOCK_METRICS);

  useEffect(() => {
    async function loadData() {
      const nets = await fetchNetworks();
      if (nets.length > 0) setNetwork(nets[0]);
      const devs = await fetchDevices();
      setDevices(devs);
      const alts = await fetchAlerts();
      setAlerts(alts);
      const mets = await fetchMetrics(nets[0]?.id || "net-demo-01");
      setMetrics(mets);
    }
    loadData();
  }, []);

  const onlineCount = devices.filter((d) => d.is_online).length;
  const riskyPortsCount = devices.reduce(
    (acc, d) => acc + d.ports.filter((p) => p.is_risky).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Subnet Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status for <span className="font-mono text-indigo-400">{network.cidr_v4}</span> ({network.name})
          </p>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Discovered Devices</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{devices.length}</span>
            <span className="text-xs text-emerald-400 font-medium">({onlineCount} Online)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Risky Open Services</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-400">{riskyPortsCount}</span>
            <span className="text-xs text-slate-400">Ports Exposed</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Gateway Latency</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">1.2</span>
            <span className="text-xs text-slate-400">ms avg RTT</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Packet Loss</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">0.0%</span>
            <span className="text-xs text-emerald-400">Optimal Link</span>
          </div>
        </div>
      </div>

      {/* Security Posture & Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SecurityScoreGauge score={network.security_score} />
        </div>
        <div className="lg:col-span-2">
          <HealthChart metrics={metrics} />
        </div>
      </div>

      {/* Active Security Advisories */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Active Security Advisories</h3>
            <p className="text-xs text-slate-400">Real-time alerts requiring administrator attention</p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-lg border flex items-start space-x-3.5 ${
                alt.severity === "critical"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : alt.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  alt.severity === "critical"
                    ? "text-rose-400"
                    : alt.severity === "warning"
                    ? "text-amber-400"
                    : "text-slate-400"
                }`}
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{alt.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(alt.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">{alt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
