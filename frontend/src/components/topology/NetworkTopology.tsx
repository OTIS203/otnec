"use client";

import React from "react";
import { Camera, Laptop, Radio, Router, Smartphone, Tv } from "lucide-react";
import { Device } from "@/types";

interface Props {
  devices: Device[];
}

export function NetworkTopology({ devices }: Props) {
  const routerDevice = devices.find((d) => d.device_type === "router") || devices[0];
  const clientDevices = devices.filter((d) => d.id !== routerDevice?.id);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white">Subnet Visual Topology Map</h2>
        <p className="text-xs text-slate-400">Interactive logical tree of discovered devices on 192.168.1.0/24</p>
      </div>

      <div className="flex flex-col items-center">
        {/* Gateway / Root Node */}
        {routerDevice && (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/20">
              <Router className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-white mt-2">
              {routerDevice.custom_name || routerDevice.hostname || "Default Gateway"}
            </span>
            <span className="text-[11px] font-mono text-indigo-400">{routerDevice.ip_address}</span>
            <span className="text-[10px] text-slate-500">{routerDevice.vendor}</span>

            {/* Downward Trunk Line */}
            <div className="w-0.5 h-12 bg-indigo-500/40 my-2"></div>
          </div>
        )}

        {/* Horizontal Distribution Bus */}
        <div className="w-5/6 h-0.5 bg-slate-800 mb-8 relative">
          <div className="absolute left-1/2 -top-1 w-2 h-2 rounded-full bg-indigo-500 transform -translate-x-1/2"></div>
        </div>

        {/* Leaf Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl">
          {clientDevices.map((dev) => (
            <div
              key={dev.id}
              className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                dev.is_online
                  ? "bg-slate-850/80 border-slate-800 hover:border-slate-700"
                  : "bg-slate-900/40 border-slate-800/40 opacity-60"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
                  dev.trust_level === "quarantined"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {dev.device_type === "pc" && <Laptop className="w-5 h-5 text-sky-400" />}
                {dev.device_type === "phone" && <Smartphone className="w-5 h-5 text-emerald-400" />}
                {dev.device_type === "camera" && <Camera className="w-5 h-5 text-rose-400" />}
                {dev.device_type === "smart_tv" && <Tv className="w-5 h-5 text-purple-400" />}
                {dev.device_type === "iot" && <Radio className="w-5 h-5 text-teal-400" />}
                {!["pc", "phone", "camera", "smart_tv", "iot"].includes(dev.device_type) && (
                  <Laptop className="w-5 h-5 text-slate-400" />
                )}
              </div>

              <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                {dev.custom_name || dev.hostname || dev.ip_address}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5">{dev.ip_address}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">{dev.vendor}</span>

              <div className="mt-3 flex items-center space-x-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dev.is_online ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
                <span className="text-[10px] text-slate-400 capitalize">
                  {dev.trust_level} • {dev.is_online ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
