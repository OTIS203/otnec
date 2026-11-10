"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Filter, ShieldAlert } from "lucide-react";
import { Alert } from "@/types";
import { MOCK_ALERTS, fetchAlerts } from "@/lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const loadAlerts = async () => {
    const data = await fetchAlerts();
    setAlerts(data);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_acknowledged: true } : a))
    );
  };

  const filtered = alerts.filter(
    (a) => filterSeverity === "all" || a.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Security & Operational Alerts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of network security threats, port anomalies, and state transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
            <option value="info">Info Only</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((alt) => (
          <div
            key={alt.id}
            className={`p-4 rounded-xl border flex items-start justify-between space-x-4 transition ${
              alt.severity === "critical"
                ? "bg-rose-500/10 border-rose-500/30"
                : alt.severity === "warning"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <ShieldAlert
                className={`w-5 h-5 mt-0.5 ${
                  alt.severity === "critical"
                    ? "text-rose-400"
                    : alt.severity === "warning"
                    ? "text-amber-400"
                    : "text-slate-400"
                }`}
              />
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-white">{alt.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      alt.severity === "critical"
                        ? "bg-rose-500/20 text-rose-300"
                        : alt.severity === "warning"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {alt.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alt.description}</p>
                <span suppressHydrationWarning className="text-[10px] text-slate-400 font-mono mt-2 block">
                  Category: {alt.category} • Detected at: {new Date(alt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {alt.is_acknowledged ? (
                <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Acknowledged</span>
                </span>
              ) : (
                <button
                  onClick={() => handleAcknowledge(alt.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

