"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Fingerprint,
  KeyRound,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          totp_code: totpCode || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Authentication failed");
      }

      const data = await res.json();

      if (data.requires_mfa) {
        setRequiresMfa(true);
        setLoading(false);
        return;
      }

      // Verify this user has admin or owner role
      const meRes = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      if (!meRes.ok) throw new Error("Failed to verify user identity");

      const me = await meRes.json();

      if (!["owner", "admin"].includes(me.role)) {
        throw new Error(
          `Access denied. Your role (${me.role}) does not have admin privileges. Contact your system owner.`
        );
      }

      // Store separately from regular user token
      localStorage.setItem("otnet_admin_token", data.access_token);
      localStorage.setItem("otnet_admin_role", me.role);
      localStorage.setItem("otnet_admin_email", me.email);

      router.push("/otnet-admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("admin@otnet.io");
    setPassword("OtnetSecure2026!");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-stretch">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex-col justify-between p-12 border-r border-slate-800 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, indigo 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-indigo-600/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/40">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl text-white tracking-tight">OTNET</span>
            <span className="block text-xs text-indigo-400 font-mono font-semibold">System Administration</span>
          </div>
        </div>

        {/* Middle Content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Restricted Access Portal
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Super-Admin<br />Control Center
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              This portal is exclusively for system owners and administrators. Manage registered users, audit fleet agents, control tenant policies, and enforce system-wide security configurations.
            </p>
          </div>

          {/* Permission Tiers */}
          <div className="space-y-3">
            {[
              { role: "Owner", desc: "Full system control, tenant & user management", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
              { role: "Admin", desc: "User management, policy enforcement, audit logs", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
            ].map((item) => (
              <div key={item.role} className={`flex items-start space-x-3 p-3 rounded-xl border ${item.bg}`}>
                <ShieldCheck className={`w-4 h-4 mt-0.5 ${item.color}`} />
                <div>
                  <span className={`font-bold text-sm ${item.color}`}>{item.role}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
            <div className="p-3 rounded-xl border bg-rose-500/5 border-rose-500/20 flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400" />
              <div>
                <span className="font-bold text-sm text-rose-400">Analyst / Viewer Roles</span>
                <p className="text-xs text-slate-400 mt-0.5">Cannot access this portal — login will be rejected automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="relative z-10 text-[11px] text-slate-500">
          All access to this system is monitored and logged. Unauthorized access is prohibited.
          <span className="text-indigo-500 ml-1">OTNET v2.4 — © 2026 Olak Tech Holdings.</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-slate-950">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center space-x-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">OTNET Admin</span>
        </div>

        <div className="max-w-sm w-full mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">Admin Sign In</h2>
            <p className="text-xs text-slate-400">
              Only users with <span className="text-amber-400 font-semibold">Owner</span> or{" "}
              <span className="text-indigo-400 font-semibold">Admin</span> roles may proceed.
            </p>
          </div>

          {/* Demo Quick-Fill */}
          <div
            onClick={fillDemo}
            className="cursor-pointer bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-3.5 flex items-start space-x-3 hover:border-indigo-500/60 transition group"
          >
            <Fingerprint className="w-5 h-5 text-indigo-400 mt-0.5 group-hover:scale-110 transition" />
            <div>
              <span className="text-xs font-bold text-indigo-300">Click to fill Demo Admin</span>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                admin@otnet.io / OtnetSecure2026!
              </div>
            </div>
            <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start">
              Owner Role
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@otnet.io"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {requiresMfa && (
              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1.5">
                  Two-Factor Authentication Code (TOTP)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-amber-200 placeholder-slate-600 font-mono tracking-widest focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "Verifying credentials…" : "Authenticate & Enter Admin"}</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ← Return to User Dashboard
            </a>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-1">🔒 Security Notice</span>
            This portal URL is not linked from the public dashboard. All login attempts, role checks, and admin actions are recorded in the system audit log.
          </div>
        </div>
      </div>
    </div>
  );
}
