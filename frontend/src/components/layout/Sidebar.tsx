"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  HardDrive,
  LayoutDashboard,
  Network,
  Settings,
  Shield,
  ShieldAlert,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Device Inventory", href: "/devices", icon: HardDrive },
  { name: "Network Map", href: "/topology", icon: Network },
  { name: "Traffic Guard", href: "/filtering", icon: Shield },
  { name: "Security Alerts", href: "/alerts", icon: ShieldAlert },
  { name: "Settings & Agent", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen text-slate-300">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-tight">NetScope</span>
          <span className="block text-xs text-indigo-400 font-mono">v1.0.0 PRO</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-xs">
            <p className="text-slate-200 font-medium">Agent Connected</p>
            <p className="text-slate-400 text-[11px]">Subnet: 192.168.1.0/24</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

