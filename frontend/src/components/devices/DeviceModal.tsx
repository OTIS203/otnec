"use client";

import React, { useState } from "react";
import { AlertTriangle, Power, Shield, Tag, X } from "lucide-react";
import { Device, TrustLevel } from "@/types";
import { updateDevice, wakeOnLan } from "@/lib/api";

interface Props {
  device: Device;
  onClose: () => void;
  onRefresh: () => void;
}

export function DeviceModal({ device, onClose, onRefresh }: Props) {
  const [customName, setCustomName] = useState(device.custom_name || "");
  const [trustLevel, setTrustLevel] = useState<TrustLevel>(device.trust_level);
  const [wolStatus, setWolStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateDevice(device.id, { custom_name: customName, trust_level: trustLevel });
    setSaving(false);
    onRefresh();
    onClose();
  };

  const handleWOL = async () => {
    setWolStatus("Sending magic packet...");
    await wakeOnLan(device.id);
    setWolStatus("Wake-on-LAN magic packet sent!");
    setTimeout(() => setWolStatus(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {device.custom_name || device.hostname || device.ip_address}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              IP: {device.ip_address} | MAC: {device.mac_address || "Unknown"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-5 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Custom Device Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Living Room Smart TV"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Trust Classification</label>
            <select
              value={trustLevel}
              onChange={(e) => setTrustLevel(e.target.value as TrustLevel)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="trusted">Trusted (Authorized Internal Device)</option>
              <option value="guest">Guest (Isolated Visitor Device)</option>
              <option value="unknown">Unknown (Newly Discovered)</option>
              <option value="quarantined">Quarantined (Suspicious / High Risk)</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-400 mb-2">Open Ports & Services</span>
            {device.ports.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No open TCP ports detected.</p>
            ) : (
              <div className="bg-slate-850 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800">
                {device.ports.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-slate-200">
                        Port {p.port}/{p.protocol}
                      </span>
                      <span className="text-slate-400 ml-2 font-medium">({p.service_name})</span>
                      {p.banner && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                          {p.banner}
                        </p>
                      )}
                    </div>
                    {p.is_risky && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Risky Port</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleWOL}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700 font-medium text-xs transition"
            >
              <Power className="w-4 h-4" />
              <span>Broadcast Wake-on-LAN Magic Packet</span>
            </button>
            {wolStatus && <p className="text-xs text-emerald-400 text-center mt-1.5">{wolStatus}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
