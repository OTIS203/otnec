"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Shield,
  Terminal,
  Server,
  Building,
  Radio,
  RefreshCw,
  Key,
  Globe,
  Cpu,
  Activity,
  Layers,
} from "lucide-react";
import { fetchNetworks, fetchDNSStatus } from "@/lib/api";
import { Network, DNSStatus } from "@/types";

export default function SettingsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [dnsStatus, setDnsStatus] = useState<DNSStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [osTab, setOsTab] = useState<"windows" | "linux">("windows");

  const defaultToken = "otnet_live_948a2bc7190d";
  const activeToken = networks[0]?.enrollment_token || defaultToken;

  const loadData = async () => {
    setLoading(true);
    const [nets, status] = await Promise.all([
      fetchNetworks(),
      fetchDNSStatus(),
    ]);
    setNetworks(nets);
    setDnsStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const windowsCommand = `.\\otnet-agent.exe -token ${activeToken} -server http://localhost:8000 -dns-guard`;
  const linuxCommand = `curl -sSL https://get.otnet.io/install.sh | sudo bash -s -- --token ${activeToken} --server http://localhost:8000`;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Organization & Edge Fleet Management
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              OTNET SaaS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-branch tenant credentials, generate 1-click agent enrollment tokens, and audit live edge nodes.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Organization Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Olak Tech Holdings (HQ)
              </h2>
              <span className="text-xs text-slate-400 font-mono">Tenant ID: ten_olak_8876a</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PRO License — Active
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Multi-Branch Mode
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Enrolled Sites</div>
            <div className="text-xl font-bold text-white mt-1">2 Branches</div>
            <div className="text-[11px] text-slate-500 mt-0.5">HQ LAN & Mobile Gateway</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Live Edge Sensors</div>
            <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>1 Node Online</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">OTIS Gateway (192.168.0.101)</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase">DNS Filter Rate</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">100% Intercept</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Port 53 Active</div>
          </div>
        </div>
      </div>

      {/* Feature #2: 1-Click Edge Agent Fleet Enrollment */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  1-Click Edge Agent Enrollment
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Feature #2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deploy the lightweight Go binary to any Windows or Linux gateway to instantly enroll into OTNET.
              </p>
            </div>
          </div>
        </div>

        {/* Enrollment Token Box */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Branch Enrollment Token (Zero-Trust Token)
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 flex items-center justify-between">
                <span>{activeToken}</span>
                <span className="text-[11px] text-slate-500">HQ Branch Pool</span>
              </div>
              <button
                onClick={() => copyToClipboard(activeToken, "token")}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center space-x-1.5 transition"
              >
                {copiedKey === "token" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quickstart Command with OS Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                1-Click Deployment Command
              </label>
              <div className="flex space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setOsTab("windows")}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    osTab === "windows"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Windows (PowerShell)
                </button>
                <button
                  onClick={() => setOsTab("linux")}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    osTab === "linux"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Linux / Gateway
                </button>
              </div>
            </div>

            <div className="relative group">
              <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
                {osTab === "windows" ? windowsCommand : linuxCommand}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    osTab === "windows" ? windowsCommand : linuxCommand,
                    "cmd"
                  )
                }
                className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded text-[11px] font-medium text-slate-300 flex items-center space-x-1 transition"
              >
                {copiedKey === "cmd" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Edge Fleet Inventory */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Enrolled Edge Nodes (Fleet Roster)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">1 Agent Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Node Name</th>
                <th className="py-2.5 px-3">IP Binding</th>
                <th className="py-2.5 px-3">Active Modules</th>
                <th className="py-2.5 px-3">Agent Version</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-850/40 transition">
                <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>OTIS-HQ-GATEWAY</span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">
                  <div>192.168.0.101 (MTN LAN)</div>
                  <div className="text-[10px] text-slate-500">192.168.137.1 (Hotspot)</div>
                </td>
                <td className="py-3 px-3 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mr-1">
                    DNS Guard
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Continuous ARP
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">OTNET v2.4.0-edge</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Multi-Factor Authentication Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication (MFA / TOTP)</h3>
            <p className="text-xs text-slate-400">
              Protect administrator policy changes and manual scan overrides with RFC 6238 TOTP.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            <span className="font-semibold block text-white">Status: Active & Enforced</span>
            <span className="text-slate-400">Authenticated via Google Authenticator / 1Password.</span>
          </div>
          <button className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition">
            Reconfigure MFA
          </button>
        </div>
      </div>
    </div>
  );
}
