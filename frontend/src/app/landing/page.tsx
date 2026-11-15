"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Shield,
  Clock,
  Terminal,
  Server,
  Zap,
  CheckCircle,
  ArrowRight,
  Lock,
  Globe,
  Wifi,
  Radio,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  Ban,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const [activeTransactionTab, setActiveTransactionTab] = useState<"dns" | "discovery">("dns");

  // Simulated live packet transactions
  const [transactions, setTransactions] = useState([
    { id: "tx-1", type: "DNS_QUERY", src: "192.168.0.155 (itel Phone)", target: "gateway.facebook.com", action: "BLOCKED", ip: "0.0.0.0", latency: "0.4ms" },
    { id: "tx-2", type: "DNS_QUERY", src: "192.168.0.101 (OTIS PC)", target: "api.github.com", action: "ALLOWED", ip: "140.82.121.6", latency: "3.2ms" },
    { id: "tx-3", type: "DNS_QUERY", src: "192.168.0.122 (iPhone)", target: "i.instagram.com", action: "BLOCKED", ip: "0.0.0.0", latency: "0.3ms" },
    { id: "tx-4", type: "ARP_PROBE", src: "OTNET Sensor", target: "192.168.0.1 (Tozed Gateway)", action: "HOST_ALIVE", ip: "98:a9:42:00:22:d9", latency: "0.8ms" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const candidates = [
        { type: "DNS_QUERY", src: "192.168.0.155", target: "tiktok.com", action: "BLOCKED", ip: "0.0.0.0", latency: "0.2ms" },
        { type: "DNS_QUERY", src: "192.168.0.101", target: "registry.npmjs.org", action: "ALLOWED", ip: "104.16.19.34", latency: "2.1ms" },
        { type: "DNS_QUERY", src: "192.168.0.122", target: "x.com", action: "BLOCKED", ip: "0.0.0.0", latency: "0.3ms" },
        { type: "PORT_SCAN", src: "OTNET Sensor", target: "192.168.0.101:445", action: "RISK_ALERT", ip: "microsoft-ds", latency: "1.1ms" },
      ];
      const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
      setTransactions((prev) => [
        { ...randomItem, id: "tx-" + Date.now() },
        ...prev.slice(0, 4),
      ]);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Public Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">OTNET</span>
              <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.4 SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#transactions" className="hover:text-white transition">Packet Flow</a>
            <a href="#schedule" className="hover:text-white transition">Work Schedules</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/25 transition flex items-center space-x-1.5"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Zero-Trust Network Intelligence & Automated Content Guard</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Total Subnet Visibility. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Automated Office Policy Enforcement.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            OTNET turns any local gateway into an intelligent traffic sensor. Enforce scheduled work hours, sinkhole distracting social media apps, and discover network risks in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/30 transition flex items-center space-x-2"
            >
              <span>Explore Live Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-sm font-semibold transition flex items-center space-x-2"
            >
              <span>⚡ 1-Click Demo Login</span>
            </Link>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 text-left">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white font-mono">0.3ms</div>
              <div className="text-xs text-slate-400 mt-1">DNS Sinkhole Response</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-emerald-400 font-mono">100%</div>
              <div className="text-xs text-slate-400 mt-1">Passive Asset Discovery</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-indigo-400 font-mono">Go Binary</div>
              <div className="text-xs text-slate-400 mt-1">Zero External Dependencies</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-amber-400 font-mono">Automated</div>
              <div className="text-xs text-slate-400 mt-1">Work & Lunch Breaks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Networking Animation & Live Packet Stream */}
      <section id="transactions" className="py-16 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Real-Time Packet Forensics</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Live Subnet Transactions & Sinkhole Stream
              </h2>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTransactionTab("dns")}
                className={`px-3 py-1.5 rounded transition ${
                  activeTransactionTab === "dns" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                DNS Traffic Guard
              </button>
              <button
                onClick={() => setActiveTransactionTab("discovery")}
                className={`px-3 py-1.5 rounded transition ${
                  activeTransactionTab === "discovery" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Network Discovery
              </button>
            </div>
          </div>

          {/* Interactive Topology Visualizer */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
              {/* Clients Node */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative">
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center">
                  <Wifi className="w-6 h-6" />
                </div>
                <div className="font-bold text-white text-sm">Staff Wi-Fi Clients</div>
                <div className="text-xs text-slate-400">Phones, Laptops, IoT Devices</div>
                <div className="inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                  192.168.0.0/24 Subnet
                </div>
              </div>

              {/* OTNET Gateway Sensor */}
              <div className="bg-gradient-to-b from-indigo-950/60 to-slate-900 border-2 border-indigo-500/50 rounded-xl p-5 space-y-2 relative shadow-lg shadow-indigo-500/20">
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="font-bold text-white text-sm">OTNET Edge Guard</div>
                <div className="text-xs text-indigo-300">Port 53 Interceptor & ARP Engine</div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                  LIVE INTERCEPT (0.0.0.0)
                </div>
              </div>

              {/* Upstream Internet */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="font-bold text-white text-sm">Public Cloud / Upstream</div>
                <div className="text-xs text-slate-400">Clean Business Traffic (Cloudflare 1.1.1.1)</div>
                <div className="inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                  WAN Gateway
                </div>
              </div>
            </div>

            {/* Live Transactions Table */}
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Recent Intercepted Packets</span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Streaming</span>
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-850 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400">{tx.type}</span>
                      <span className="text-slate-300 font-semibold">{tx.src}</span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-indigo-300">{tx.target}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {tx.action === "BLOCKED" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                          <Ban className="w-3 h-3" />
                          <span>SINKHOLED ({tx.ip})</span>
                        </span>
                      ) : tx.action === "RISK_ALERT" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {tx.action}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>RESOLVED ({tx.ip})</span>
                        </span>
                      )}
                      <span className="text-slate-500 text-[11px]">{tx.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Pillars */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Engine Architecture
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Built for Real-World Enterprise Networks
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Everything you need to secure, monitor, and enforce acceptable use policies across your team's hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-indigo-500/40 transition">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Scheduled Access Policies</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define custom work hours (08:00–17:00) where social media is blocked, and lunch breaks (12:00–13:00) where staff enjoy unrestricted access.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-indigo-500/40 transition">
            <div className="w-10 h-10 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero-Trust DNS Sinkholing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Binds port 53 with SO_REUSEADDR. Intercepts DNS queries for TikTok, Instagram, Facebook, and returns 0.0.0.0 in 0.3ms without slowing network speed.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-indigo-500/40 transition">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">1-Click Go Agent Fleet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deploy a single standalone Go binary (<code className="font-mono text-emerald-300">otnet-agent.exe</code>) with an enrollment token to manage remote branch offices effortlessly.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-indigo-500/40 transition">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Passive ARP & Port Scanning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discovers every smartphone, PC, and router on the subnet. Flags high-risk exposed ports (SMB 445, RDP 3389, Telnet 23) before vulnerabilities are exploited.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="py-16 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white">Transparent SaaS Pricing</h2>
            <p className="text-xs text-slate-400">Scale from a single office router to hundreds of enterprise branch sites.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="text-sm font-bold text-slate-300">Community / Lab</div>
              <div className="text-3xl font-extrabold text-white">$0 <span className="text-xs font-normal text-slate-500">/mo</span></div>
              <p className="text-xs text-slate-400">For home labs and single subnet monitoring.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Up to 25 devices</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Manual DNS Filtering</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Single Gateway</span></li>
              </ul>
              <Link href="/login" className="block text-center w-full py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-bold transition">
                Start Free
              </Link>
            </div>

            <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-indigo-500 rounded-2xl p-6 space-y-4 shadow-xl shadow-indigo-500/20 relative">
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow">
                MOST POPULAR
              </span>
              <div className="text-sm font-bold text-indigo-300">Business Pro</div>
              <div className="text-3xl font-extrabold text-white">$49 <span className="text-xs font-normal text-slate-500">/mo</span></div>
              <p className="text-xs text-slate-400">For commercial offices, schools, and business headquarters.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Unlimited devices</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Automated Scheduled Policies</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Lunch Break Unblock Windows</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Continuous ARP Sensor</span></li>
              </ul>
              <Link href="/login" className="block text-center w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition">
                Launch Business
              </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="text-sm font-bold text-slate-300">Enterprise Multi-Branch</div>
              <div className="text-3xl font-extrabold text-white">$199 <span className="text-xs font-normal text-slate-500">/mo</span></div>
              <p className="text-xs text-slate-400">For distributed retail chains and branch offices.</p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>1-Click Fleet Enrollment</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Multi-Tenant Organizations</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Super-Admin Management</span></li>
                <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>24/7 Priority SLA</span></li>
              </ul>
              <Link href="/login" className="block text-center w-full py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-bold transition">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              O
            </div>
            <span className="text-slate-300 font-bold">OTNET</span>
            <span>— © 2026 Olak Tech Holdings. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-slate-300 transition">Console</Link>
            <Link href="/filtering" className="hover:text-slate-300 transition">Traffic Guard</Link>
            <Link href="/admin" className="hover:text-slate-300 transition">Super-Admin</Link>
            <Link href="/login" className="hover:text-slate-300 transition">Sign In</Link>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
