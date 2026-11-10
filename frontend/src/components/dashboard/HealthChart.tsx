"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NetworkMetric } from "@/types";

interface Props {
  metrics: NetworkMetric[];
}

export function HealthChart({ metrics }: Props) {
  const chartData = metrics.map((m) => {
    const time = new Date(m.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      time,
      latency: Number(m.latency_ms.toFixed(1)),
      jitter: Number(m.jitter_ms.toFixed(1)),
      loss: m.packet_loss_pct,
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-300">Network Telemetry (Last 24 Hours)</h3>
          <p className="text-xs text-slate-400">Continuous latency and jitter benchmark</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span className="text-slate-400">Latency (ms)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400">Jitter (ms)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorJitter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLatency)"
            />
            <Area
              type="monotone"
              dataKey="jitter"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorJitter)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

