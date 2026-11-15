"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Trash2,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Building,
  Key,
  Server,
  Activity,
  Crown,
  Database,
  Lock,
} from "lucide-react";
import { ClientTime } from "@/components/common/ClientTime";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  mfa_enabled: boolean;
  created_at: string;
}

interface OverviewStats {
  total_users: number;
  total_tenants: number;
  total_networks: number;
  total_devices: number;
  total_queries: number;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [newTenant, setNewTenant] = useState("Headquarters");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("http://localhost:8000/api/v1/admin/users"),
        fetch("http://localhost:8000/api/v1/admin/overview"),
      ]);

      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setActionMsg("User role updated successfully!");
        setTimeout(() => setActionMsg(null), 3000);
        await loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user: ${email}?`)) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionMsg(`User ${email} deleted.`);
        setTimeout(() => setActionMsg(null), 3000);
        await loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          tenant_name: newTenant,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmail("");
        setNewPassword("");
        setActionMsg("New user created successfully!");
        setTimeout(() => setActionMsg(null), 3000);
        await loadAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create user");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              System Owner & Super-Admin Console
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Master Control
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global directory of registered system operators, tenant accounts, and network engine telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/30 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Operator</span>
          </button>
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats?.total_users ?? users.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Account directory</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Tenants</span>
            <Building className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {stats?.total_tenants ?? 1}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Organizations managed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Discovered Devices</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats?.total_devices ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Laptops, phones & gateways</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DNS Queries Governed</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {stats?.total_queries ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Audited & sinkholed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Security Engine</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-2 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPERATIONAL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Port 53 & ARP Daemon</div>
        </div>
      </div>

      {/* Registered Users Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Operator & User Directory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control roles, assign tenants, and revoke access for system members.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{users.length} Total Users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">User Email</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Organization (Tenant)</th>
                <th className="py-2.5 px-3">MFA Status</th>
                <th className="py-2.5 px-3">Registered At</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-850/40 transition">
                  <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                      {u.email[0]}
                    </span>
                    <span>{u.email}</span>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="owner">👑 Owner</option>
                      <option value="admin">🛡️ Admin</option>
                      <option value="analyst">📊 Analyst</option>
                      <option value="viewer">👁️ Viewer</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium">
                    {u.tenant_name}
                  </td>
                  <td className="py-3 px-3">
                    {u.mfa_enabled ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        2FA Enforced
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                        Password Only
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    <ClientTime isoString={u.created_at} format="datetime" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Create Operator Account</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="admin">Administrator</option>
                    <option value="analyst">Analyst (Auditor)</option>
                    <option value="owner">Owner (Full Control)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenant}
                    onChange={(e) => setNewTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {submitting ? "Creating..." : "Save Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
