"use client";

import React, { useState } from "react";
import { Copy, Key, QrCode, Shield, Terminal } from "lucide-react";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const sampleEnrollToken = "NETSCOPE-ENROLL-7f9a2b4c8d1e0f2a-PROD";
  const agentRunCommand = `sudo ./netscope-agent --server http://localhost:8000 --token ${sampleEnrollToken}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System Settings & Agent Deployment</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure agent enrollment tokens, multi-factor authentication, and scanning rules.
        </p>
      </div>

      {/* Agent Enrollment Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Enroll New Edge Agent</h3>
            <p className="text-xs text-slate-400">
              Run this single static Go binary on any device in the target subnet.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Active Enrollment Token (TTL 1 hour)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={sampleEnrollToken}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(sampleEnrollToken)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Agent Quickstart Command
            </label>
            <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
              {agentRunCommand}
            </pre>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication (MFA / TOTP)</h3>
            <p className="text-xs text-slate-400">
              Protect administrator actions and scan triggers with Google Authenticator or 1Password.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            <span className="font-semibold block text-white">Status: Active & Enforced</span>
            <span className="text-slate-400">RFC 6238 standard TOTP enabled for owner account.</span>
          </div>
          <button className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition">
            Reconfigure MFA
          </button>
        </div>
      </div>
    </div>
  );
}

