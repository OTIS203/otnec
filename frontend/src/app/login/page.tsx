"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Building,
  UserPlus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Sign In States
  const [email, setEmail] = useState("admin@otnet.io");
  const [password, setPassword] = useState("OtnetSecure2026!");
  const [totpCode, setTotpCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);

  // Sign Up States
  const [regTenantName, setRegTenantName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
        throw new Error(errData.detail || "Invalid email or password");
      }

      const data = await res.json();
      if (data.requires_mfa) {
        setRequiresMfa(true);
        setLoading(false);
        return;
      }

      // Store JWT in localStorage
      localStorage.setItem("netscope_token", data.access_token);
      localStorage.setItem("otnet_user", email);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail("admin@otnet.io");
    setPassword("OtnetSecure2026!");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@otnet.io",
          password: "OtnetSecure2026!",
        }),
      });

      if (!res.ok) {
        throw new Error("Demo login error");
      }

      const data = await res.json();
      localStorage.setItem("netscope_token", data.access_token);
      localStorage.setItem("otnet_user", "admin@otnet.io");
      router.push("/");
    } catch {
      // Offline fallback: allow immediate entry
      localStorage.setItem("netscope_token", "demo-token");
      localStorage.setItem("otnet_user", "admin@otnet.io");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: regTenantName,
          email: regEmail,
          password: regPassword,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Registration failed. Try a different email.");
      }

      setSuccessMsg("Account created successfully! Signing you in...");
      // Auto login
      const loginRes = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
        }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        localStorage.setItem("netscope_token", loginData.access_token);
        localStorage.setItem("otnet_user", regEmail);
        setTimeout(() => router.push("/"), 1200);
      } else {
        setActiveTab("signin");
        setEmail(regEmail);
        setPassword(regPassword);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-13 h-13 p-3 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <Activity className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white">
          OTNET Platform
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Network Intelligence, Zero-Trust DNS Guard & Content Policy Enforcement
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-7 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-5">
          {/* Sign In / Sign Up Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setError(null);
              }}
              className={`py-2 rounded-lg transition ${
                activeTab === "signin"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setError(null);
              }}
              className={`py-2 rounded-lg transition ${
                activeTab === "signup"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* 1-Click Demo Account Banner */}
          {activeTab === "signin" && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Demo Admin Credentials</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Ready to test
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                <div>Email: <strong className="text-white">admin@otnet.io</strong></div>
                <div>Password: <strong className="text-white">OtnetSecure2026!</strong></div>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition flex items-center justify-center space-x-1.5"
              >
                <span>⚡ 1-Click Instant Demo Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === "signin" && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {requiresMfa && (
                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">
                    Two-Factor Authentication Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="6-digit code"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? "Authenticating..." : "Sign In to Console"}</span>
              </button>
            </form>
          )}

          {/* SIGN UP / REGISTER FORM */}
          {activeTab === "signup" && (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organization / Tenant Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={regTenantName}
                    onChange={(e) => setRegTenantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Olak Tech Holdings"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="admin@yourcompany.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Secure Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Create strong password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? "Creating Tenant..." : "Create Free Account"}</span>
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <a
              href="/landing"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
            >
              <span>Back to Public Product Showcase</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
