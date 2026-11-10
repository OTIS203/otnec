"use client";

import React, { useState } from "react";
import {
  Camera,
  CheckCircle,
  HelpCircle,
  Laptop,
  Power,
  Printer,
  Radio,
  Router,
  Search,
  Shield,
  Smartphone,
  Tv,
} from "lucide-react";
import { Device, DeviceType, TrustLevel } from "@/types";
import { DeviceModal } from "./DeviceModal";

interface Props {
  devices: Device[];
  onRefresh: () => void;
}

export function DeviceTable({ devices, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case "router":
        return <Router className="w-4 h-4 text-indigo-400" />;
      case "pc":
        return <Laptop className="w-4 h-4 text-sky-400" />;
      case "phone":
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case "smart_tv":
        return <Tv className="w-4 h-4 text-purple-400" />;
      case "printer":
        return <Printer className="w-4 h-4 text-amber-400" />;
      case "camera":
        return <Camera className="w-4 h-4 text-rose-400" />;
      case "iot":
        return <Radio className="w-4 h-4 text-teal-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrustBadge = (trust: TrustLevel) => {
    switch (trust) {
      case "trusted":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Trusted
          </span>
        );
      case "guest":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
            Guest
          </span>
        );
      case "quarantined":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Quarantined
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Unknown
          </span>
        );
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.ip_address.toLowerCase().includes(search.toLowerCase()) ||
      (d.hostname && d.hostname.toLowerCase().includes(search.toLowerCase())) ||
      (d.custom_name && d.custom_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.mac_address && d.mac_address.toLowerCase().includes(search.toLowerCase())) ||
      (d.vendor && d.vendor.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === "all" || d.device_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IP, MAC, hostname, or vendor..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Device Classes</option>
            <option value="router">Gateway / Routers</option>
            <option value="pc">PCs / Workstations</option>
            <option value="phone">Smartphones</option>
            <option value="smart_tv">Smart TVs / Media</option>
            <option value="printer">Printers</option>
            <option value="camera">IP Cameras</option>
            <option value="iot">Smart Home (IoT)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-850/60 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Device Name & Type</th>
              <th className="py-3 px-4">IP & MAC Address</th>
              <th className="py-3 px-4">Hardware Vendor</th>
              <th className="py-3 px-4">Open Ports</th>
              <th className="py-3 px-4">Trust Tier</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredDevices.map((dev) => (
              <tr
                key={dev.id}
                onClick={() => setSelectedDevice(dev)}
                className="hover:bg-slate-800/40 cursor-pointer transition"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                      {getDeviceIcon(dev.device_type)}
                    </div>
                    <div>
                      <span className="font-medium text-white block">
                        {dev.custom_name || dev.hostname || dev.ip_address}
                      </span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {dev.device_type} {dev.os_guess ? `• ${dev.os_guess}` : ""}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-[11px]">
                  <span className="text-slate-200 block">{dev.ip_address}</span>
                  <span className="text-slate-500">{dev.mac_address || "No MAC"}</span>
                </td>
                <td className="py-3 px-4 text-slate-300">{dev.vendor || "Unknown Vendor"}</td>
                <td className="py-3 px-4">
                  {dev.ports.length === 0 ? (
                    <span className="text-slate-500">None</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-indigo-300">
                      {dev.ports.length} port{dev.ports.length > 1 ? "s" : ""}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">{getTrustBadge(dev.trust_level)}</td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`inline-flex items-center space-x-1.5 text-[11px] font-medium ${
                      dev.is_online ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        dev.is_online ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
                      }`}
                    />
                    <span>{dev.is_online ? "Online" : "Offline"}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

