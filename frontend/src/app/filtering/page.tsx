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
  Copy,
  Check,
  Radio,
  Router,
  Laptop,
  Wifi,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Coffee,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { DNSQueryLog, FilterPolicy, DNSStats, DNSStatus } from "@/types";
import {
  fetchDNSLogs,
  fetchDNSStats,
  fetchFilterPolicy,
  updateFilterPolicy,
  fetchDNSStatus,
} from "@/lib/api";
import { ClientTime } from "@/components/common/ClientTime";

export default function FilteringPage() {
  const [logs, setLogs] = useState<DNSQueryLog[]>([]);
  const [stats, setStats] = useState<DNSStats | null>(null);
  const [policy, setPolicy] = useState<FilterPolicy | null>(null);
  const [dnsStatus, setDnsStatus] = useState<DNSStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSetupTab, setActiveSetupTab] = useState<"router" | "ios" | "android" | "windows">("router");
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(true);

  // Schedule Policy States
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [workStart, setWorkStart] = useState<string>("08:00");
  const [workEnd, setWorkEnd] = useState<string>("17:00");
  const [lunchStart, setLunchStart] = useState<string>("12:00");
  const [lunchEnd, setLunchEnd] = useState<string>("13:00");
  const [weekdaysOnly, setWeekdaysOnly] = useState<boolean>(true);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // New Custom Domain
  const [newDomain, setNewDomain] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const [logsData, statsData, policyData, statusData] = await Promise.all([
      fetchDNSLogs(),
      fetchDNSStats(),
      fetchFilterPolicy(),
      fetchDNSStatus(),
    ]);
    setLogs(logsData);
    setStats(statsData);
    setPolicy(policyData);
    if (policyData && !savingSchedule) {
      setScheduleEnabled(policyData.schedule_enabled ?? false);
      setWorkStart(policyData.schedule_work_start ?? "08:00");
      setWorkEnd(policyData.schedule_work_end ?? "17:00");
      setLunchStart(policyData.schedule_lunch_start ?? "12:00");
      setLunchEnd(policyData.schedule_lunch_end ?? "13:00");
      setWeekdaysOnly(policyData.schedule_weekdays_only ?? true);
    }
    setDnsStatus(statusData);
    setLoading(false);
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
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

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setSaveSuccessMsg(null);
    const updated = await updateFilterPolicy({
      schedule_enabled: scheduleEnabled,
      schedule_work_start: workStart,
      schedule_work_end: workEnd,
      schedule_lunch_start: lunchStart,
      schedule_lunch_end: lunchEnd,
      schedule_weekdays_only: weekdaysOnly,
    });
    if (updated) {
      setPolicy(updated);
      setSaveSuccessMsg("Schedule saved & policy active!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      await loadData();
    }
    setSavingSchedule(false);
  };

  const applyPreset = (wStart: string, wEnd: string, lStart: string, lEnd: string) => {
    setScheduleEnabled(true);
    setWorkStart(wStart);
    setWorkEnd(wEnd);
    setLunchStart(lStart);
    setLunchEnd(lEnd);
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

  // Pagination calculation
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Traffic Guard & Content Control</h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              OTNET Guard
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Enforce scheduled work-hour policies, audit staff device lookups, and sinkhole distracting domains.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-950/70 border border-indigo-500/40 rounded-lg text-xs font-mono shadow-sm">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="text-slate-400">DNS Server IP:</span>
            <strong className="text-indigo-300 font-bold">{dnsStatus?.dns_ip || "192.168.1.246"}</strong>
            <button
              onClick={() => handleCopy(dnsStatus?.dns_ip || "192.168.1.246", "header_ip")}
              className="ml-1 text-[11px] px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-semibold transition"
            >
              {copiedKey === "header_ip" ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-indigo-500/30 transition"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{showSetupGuide ? "Hide Setup Guide" : "DNS Setup Guide"}</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PROMINENT TOP CARD: Scheduled Access Policy (Work Hours & Lunch Break Automation) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-5">
        {/* Card Header with Live Status */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-indigo-500/20 gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/25 text-indigo-300 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Scheduled Access Policies (Work Hours & Lunch Break)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Automation
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically blocks social media during office hours, and unblocks during lunch break and off-hours.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {policy?.schedule_status_text && (
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center space-x-2 ${policy.is_schedule_active
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${policy.is_schedule_active ? "bg-rose-400 animate-ping" : "bg-emerald-400"
                    }`}
                />
                <span>{policy.schedule_status_text}</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Presets Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick Presets:</span>
          </span>
          <button
            onClick={() => applyPreset("08:00", "17:00", "12:00", "13:00")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            🏢 Standard HQ (08:00–17:00 | Lunch: 12:00–13:00)
          </button>
          <button
            onClick={() => applyPreset("09:00", "18:00", "13:00", "14:00")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            💼 Corporate (09:00–18:00 | Lunch: 13:00–14:00)
          </button>
          <button
            onClick={() => applyPreset("07:30", "16:30", "12:00", "13:00")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            ⚡ Early Shift (07:30–16:30 | Lunch: 12:00–13:00)
          </button>
        </div>

        {/* Time Inputs & Enforcement Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Master Enable Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Automated Schedule</span>
              <span className="text-[11px] text-slate-400">
                {scheduleEnabled ? "Active & Enforced" : "Disabled (Manual mode)"}
              </span>
            </div>
            <button
              onClick={() => setScheduleEnabled(!scheduleEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduleEnabled ? "bg-indigo-600" : "bg-slate-700"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scheduleEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          {/* Work Hours Start & End */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Work Hours (Social Media Blocked)</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                disabled={!scheduleEnabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-50 font-mono w-28 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500 text-xs font-medium">to</span>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                disabled={!scheduleEnabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-50 font-mono w-28 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Lunch Break Start & End */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-300">
              <Coffee className="w-3.5 h-3.5" />
              <span>Lunch Break (Social Media Allowed)</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={lunchStart}
                onChange={(e) => setLunchStart(e.target.value)}
                disabled={!scheduleEnabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-50 font-mono w-28 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500 text-xs font-medium">to</span>
              <input
                type="time"
                value={lunchEnd}
                onChange={(e) => setLunchEnd(e.target.value)}
                disabled={!scheduleEnabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-50 font-mono w-28 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Weekday enforcement & Save button */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-200 select-none font-medium">
              <input
                type="checkbox"
                checked={weekdaysOnly}
                onChange={(e) => setWeekdaysOnly(e.target.checked)}
                disabled={!scheduleEnabled}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 disabled:opacity-50 w-4 h-4"
              />
              <span>Monday – Friday Only (Weekend Unblocked)</span>
            </label>
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${savingSchedule ? "animate-spin" : ""}`} />
              <span>{savingSchedule ? "Saving Schedule..." : "Save Schedule Policy"}</span>
            </button>
          </div>
        </div>

        {/* Visual 24-Hour Timeline Bar */}
        <div className="pt-2 border-t border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">24-Hour Daily Policy Distribution:</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                <span className="text-rose-300">Blocked ({workStart}–{lunchStart}, {lunchEnd}–{workEnd})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span className="text-emerald-300">Lunch Break ({lunchStart}–{lunchEnd})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-700" />
                <span>Off-Hours (Allowed)</span>
              </span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
            <div className="h-full bg-slate-700" style={{ width: "33%" }} title="Off Hours (Allowed)" />
            <div className="h-full bg-rose-600" style={{ width: "17%" }} title="Work Hours (Blocked)" />
            <div className="h-full bg-emerald-500" style={{ width: "5%" }} title="Lunch Break (Allowed)" />
            <div className="h-full bg-rose-600" style={{ width: "16%" }} title="Work Hours (Blocked)" />
            <div className="h-full bg-slate-700" style={{ width: "29%" }} title="Evening Off Hours (Allowed)" />
          </div>
          {saveSuccessMsg && (
            <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5 pt-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Router / Device DNS Setup Guide */}
      {showSetupGuide && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                DNS Gateway & Router Configuration
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">
                Primary DNS: <strong className="text-indigo-300 font-bold text-sm">{dnsStatus?.dns_ip || "192.168.1.246"}</strong>
              </span>
              <button
                onClick={() => handleCopy(dnsStatus?.dns_ip || "192.168.1.246", "primary")}
                className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition"
              >
                {copiedKey === "primary" ? "Copied" : "Copy IP"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>1. Mobile Hotspot (Easiest)</span>
                <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded">Auto</span>
              </div>
              <p>Turn on Windows Hotspot <strong>OTIS DNS</strong>. Connect phones/laptops to it. OTNET intercepts all DNS on <code>192.168.137.1</code>.</p>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>2. Router DHCP Setup</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">All Devices</span>
              </div>
              <p>Log in to router (192.168.1.1) &gt; DHCP Server &gt; Set Primary DNS to <code>{dnsStatus?.dns_ip || "192.168.1.246"}</code>.</p>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>3. Single Phone / PC DNS</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Manual</span>
              </div>
              <p>In Wi-Fi settings on phone or PC, edit DNS (Static/Manual) and set DNS 1 to <code>{dnsStatus?.dns_ip || "192.168.1.246"}</code>.</p>
            </div>
          </div>
        </div>
      )}

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
            className={`text-xl font-bold mt-2 ${policy?.block_social_media ? "text-rose-400" : "text-emerald-400"
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
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Manual Policy Overrides</h2>
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${policy?.block_social_media ? "bg-rose-600" : "bg-slate-700"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy?.block_social_media ? "translate-x-6" : "translate-x-1"
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${policy?.block_streaming ? "bg-rose-600" : "bg-slate-700"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy?.block_streaming ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            💡 When enabled, the local OTNET DNS sinkholes queries instantly. All connected phones and PCs receive connection errors for these domains.
          </div>
        </div>

        {/* Top Social Media Apps Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Apps Accessed</h2>
            <span className="text-xs text-slate-400 font-mono">By Query Volume</span>
          </div>

          <div className="space-y-3">
            {stats?.top_social_apps && stats.top_social_apps.length > 0 ? (
              stats.top_social_apps.map((app) => (
                <div key={app.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-200">{app.name}</span>
                    <span className="text-slate-400 font-mono">{app.count} queries</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(15, (Number(app.count) / Math.max(1, stats.social_queries)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                No social media queries detected yet.
              </div>
            )}
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

      {/* Real-time Query Activity Log with PAGINATION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Device Traffic Stream</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                {totalEntries} Queries
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect target domains per device IP, hostname, and enforcement actions.
            </p>
          </div>

          {/* Search, Category Filter, Status Filter & Page Size */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search device, IP, domain..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Social Media">Social Media</option>
              <option value="Streaming Video">Streaming Video</option>
              <option value="General">General Web</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="blocked">Blocked Only</option>
              <option value="allowed">Allowed Only</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
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
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
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
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${log.category === "Social Media"
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

        {/* Pagination Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-800 gap-3 text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(currentPage * pageSize, totalEntries)}
            </span>{" "}
            of <span className="font-semibold text-white">{totalEntries}</span> traffic records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded bg-slate-950 font-mono text-indigo-300 border border-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
