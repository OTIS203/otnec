"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Globe,
  Ban,
  CheckCircle,
  Filter,
  RefreshCw,
  Search,
  Sliders,
} from "lucide-react";
import { DNSQueryLog, FilterPolicy, DNSStats } from "@/types";
import {
  fetchDNSLogs,
  fetchDNSStats,
  fetchFilterPolicy,
  updateFilterPolicy,
} from "@/lib/api";
import { ClientTime } from "@/components/common/ClientTime";

export default function FilteringPage() {
  const [logs, setLogs] = useState<DNSQueryLog[]>([]);
  const [stats, setStats] = useState<DNSStats | null>(null);
  const [policy, setPolicy] = useState<FilterPolicy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Custom Domain
  const [newDomain, setNewDomain] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const [logsData, statsData, policyData] = await Promise.all([
      fetchDNSLogs(),
      fetchDNSStats(),
      fetchFilterPolicy(),
    ]);
    setLogs(logsData);
    setStats(statsData);
    setPolicy(policyData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSocialMedia = async () => {
    if (!policy) return;
    setSaving(true);
    const updated = await updateFilterPolicy({
      block_social_media: !policy.block_social_media,
    });
    if (updated) {
      setPolicy(updated);
      await loadData();
    }
    setSaving(false);
  };

  const handleToggleStreaming = async () => {
    if (!policy) return;
    setSaving(true);
    const updated = await updateFilterPolicy({
      block_streaming: !policy.block_streaming,
    });
    if (updated) {
      setPolicy(updated);
      await loadData();
    }
    setSaving(false);
  };

  const handleAddCustomBlock = async () => {
    if (!policy || !newDomain.trim()) return;
    const currentList = policy.custom_blacklist || [];
    if (currentList.includes(newDomain.trim().toLowerCase())) return;

    setSaving(true);
    const updated = await updateFilterPolicy({
      custom_blacklist: [...currentList, newDomain.trim().toLowerCase()],
    });
    if (updated) {
      setPolicy(updated);
      setNewDomain("");
      await loadData();
    }
    setSaving(false);
  };

  const handleRemoveCustomBlock = async (domain: string) => {
    if (!policy) return;
    setSaving(true);
    const updated = await updateFilterPolicy({
      custom_blacklist: (policy.custom_blacklist || []).filter((d) => d !== domain),
    });
    if (updated) {
      setPolicy(updated);
      await loadData();
    }
    setSaving(false);
  };

  // Filtered queries
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.client_ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.client_hostname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || log.category === selectedCategory;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "blocked" && log.is_blocked) ||
      (statusFilter === "allowed" && !log.is_blocked);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Traffic Guard & Content Control</h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live DNS Filter
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Audit which social media platforms staff devices are accessing in real time and enforce network-wide block rules.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          <span>Refresh Traffic</span>
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Lookups Audited</span>
            <Globe className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats?.total_queries ?? logs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">From all office PCs & phones</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Social Media Queries</span>
            <Smartphone className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2 font-mono">
            {stats?.social_queries ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">TikTok, Instagram, Facebook, X</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Blocked Access Attempts</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {stats?.blocked_queries ?? 0}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Sinkholed to 0.0.0.0</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Social Media Shield</span>
            {policy?.block_social_media ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold mt-2 ${
              policy?.block_social_media ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {policy?.block_social_media ? "BLOCKING ACTIVE" : "UNRESTRICTED"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {policy?.block_social_media ? "Apps fail to connect" : "Employees have access"}
          </div>
        </div>
      </div>

      {/* Control Panel: Category Policies & Custom Blacklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Toggles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Access Policy Controls</h2>
          </div>

          <div className="space-y-4">
            {/* Social Media Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-sm font-semibold text-white block">Block Social Media</span>
                <span className="text-xs text-slate-400">
                  TikTok, Instagram, Facebook, X, Snapchat, Reddit
                </span>
              </div>
              <button
                onClick={handleToggleSocialMedia}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  policy?.block_social_media ? "bg-rose-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    policy?.block_social_media ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Video Streaming Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-sm font-semibold text-white block">Block Video Streaming</span>
                <span className="text-xs text-slate-400">YouTube, Netflix, Twitch</span>
              </div>
              <button
                onClick={handleToggleStreaming}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  policy?.block_streaming ? "bg-rose-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    policy?.block_streaming ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            💡 When enabled, the local NetScope DNS sinkholes queries instantly. All connected phones and PCs receive connection errors for these domains.
          </div>
        </div>

        {/* Top Social Media Apps Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Apps Accessed</h2>
            <span className="text-xs text-slate-400 font-mono">By Query Volume</span>
          </div>

          <div className="space-y-3">
            {(stats?.top_social_apps && stats.top_social_apps.length > 0
              ? stats.top_social_apps
              : [
                  { name: "TikTok", count: 3 },
                  { name: "Instagram", count: 2 },
                  { name: "Facebook", count: 1 },
                  { name: "X (Twitter)", count: 1 },
                  { name: "Snapchat", count: 1 },
                ]
            ).map((app) => (
              <div key={app.name} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-200">{app.name}</span>
                  <span className="text-slate-400 font-mono">{app.count} queries</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(15, (Number(app.count) / 5) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Blacklist Manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Custom Blocked Domains</h2>
            <span className="text-xs text-slate-400">Manual rules</span>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. gambling-site.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddCustomBlock}
              disabled={saving || !newDomain.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition"
            >
              Block
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {(policy?.custom_blacklist && policy.custom_blacklist.length > 0) ? (
              policy.custom_blacklist.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 text-rose-300 text-xs font-mono border border-rose-500/20"
                >
                  <span>{domain}</span>
                  <button
                    onClick={() => handleRemoveCustomBlock(domain)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No custom blocked domains.</span>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Query Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Device Traffic Stream</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect target domains per device IP, hostname, and enforcement actions.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search device, IP, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Social Media">Social Media</option>
              <option value="Streaming Video">Streaming Video</option>
              <option value="General">General Web</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="blocked">Blocked Only</option>
              <option value="allowed">Allowed Only</option>
            </select>
          </div>
        </div>

        {/* Table of Live DNS Queries */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Device / Host</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">App / Service</th>
                <th className="py-2.5 px-3">Queried Domain</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Enforcement</th>
                <th className="py-2.5 px-3 text-right">Detected At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center space-x-2">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.client_hostname || "Staff Device"}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{log.client_ip}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{log.service_name}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-300">{log.domain}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          log.category === "Social Media"
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : log.category === "Streaming Video"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.is_blocked ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Ban className="w-3 h-3" />
                          <span>BLOCKED (0.0.0.0)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          <span>ALLOWED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      <ClientTime isoString={log.queried_at} format="datetime" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching traffic records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

