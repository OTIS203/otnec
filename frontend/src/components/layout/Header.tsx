"use client";

import React, { useEffect, useState } from "react";
import { Bell, RefreshCw, ShieldCheck, Wifi } from "lucide-react";

export function Header() {
  const [wsStatus, setWsStatus] = useState<"connected" | "connecting" | "offline">("connected");
  const [lastRefreshed, setLastRefreshed] = useState("Just now");

  useEffect(() => {
    // Attempt WebSocket connection to backend live feed
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/live";
    try {
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsStatus("connected");
      socket.onerror = () => setWsStatus("offline");
      socket.onclose = () => setWsStatus("offline");
      return () => socket.close();
    } catch {
      setWsStatus("offline");
    }
  }, []);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between text-slate-300">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-white">Network Security & Observability</h1>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-800 border border-slate-700">
          <Wifi className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-300">192.168.1.0/24</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              wsStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="text-slate-400">
            {wsStatus === "connected" ? "Live Stream (WSS)" : "Polling Mode"}
          </span>
        </div>

        <button
          onClick={() => {
            setLastRefreshed("Refreshing...");
            setTimeout(() => setLastRefreshed("Just now"), 800);
          }}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Now</span>
        </button>

        <div className="w-px h-6 bg-slate-800" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
            NS
          </div>
          <span className="text-sm font-medium text-slate-200">Admin</span>
        </div>
      </div>
    </header>
  );
}
