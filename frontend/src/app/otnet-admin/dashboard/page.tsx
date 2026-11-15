"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  Trash2,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Building,
  Server,
  Activity,
  Crown,
  LogOut,
  Lock,
  Settings,
  Eye,
  Database,
  ChevronRight,
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

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  admin: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  analyst: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  viewer: "bg-slate-700 text-slate-300 border-slate-600",
};

const ROLE_ICONS: Record<string, string> = {
  owner: "👑",
  admin: "🛡️",
  analyst: "📊",
  viewer: "👁️",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<"users" | "overview">("overview");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminRole, setAdminRole] = useState<string>("");

  // New User Form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [newTenant, setNewTenant] = useState("Headquarters");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("otnet_admin_token") : null;

  // Guard: redirect if not authenticated
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/otnet-admin/login");
      return;
    }
    setAdminEmail(localStorage.getItem("otnet_admin_email") || "");
    setAdminRole(localStorage.getItem("otnet_admin_role") || "");
    loadAdminData(token);
  }, [router]);

  const loadAdminData = async (token?: string) => {
    setLoading(true);
    const t = token || getToken();
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${t}` };
      const [usersRes, statsRes] = await Promise.all([
        fetch("http://localhost:8000/api/v1/admin/users", { headers }),
        fetch("http://localhost:8000/api/v1/admin/overview", { headers }),
      ]);

      if (usersRes.status === 401 || usersRes.status === 403) {
        handleLogout();
        return;
      }

      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("otnet_admin_token");
    localStorage.removeItem("otnet_admin_role");
    localStorage.removeItem("otnet_admin_email");
    router.push("/otnet-admin/login");
  };

  const notify = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        notify("success", "Role updated successfully.");
        await loadAdminData();
      } else {
        notify("error", "Failed to update role.");
      }
    } catch {
      notify("error", "Network error while updating role.");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete account: ${email}?\n\nThis action cannot be undone.`)) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        notify("success", `${email} has been deleted.`);
        await loadAdminData();
      } else {
        notify("error", "Failed to delete user.");
      }
    } catch {
      notify("error", "Network error while deleting user.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          tenant_name: newTenant,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewEmail(""); setNewPassword("");
        notify("success", "New operator account created successfully!");
        await loadAdminData();
      } else {
        const err = await res.json();
        notify("error", err.detail || "Failed to create user.");
      }
    } catch {
      notify("error", "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const navItems = [
    { id: "overview", label: "System Overview", icon: Activity },
    { id: "users", label: "User Directory", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Admin Sidebar — Completely separate from user sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
        {/* Admin Brand Header */}
        <div className="p-6 border-b border-slate-800 space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight">OTNET</span>
              <span className="block text-[11px] text-amber-400 font-mono font-bold">SUPER ADMIN</span>
            </div>
          </div>
        </div>

        {/* Admin Who's logged in */}
        <div className="mx-4 mt-4 p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Signed in as</div>
          <div className="font-semibold text-white text-xs mt-0.5 truncate">{adminEmail || "admin@otnet.io"}</div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_COLORS[adminRole] || ROLE_COLORS.admin}`}>
            {ROLE_ICONS[adminRole] || "🛡️"} {adminRole || "admin"}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
              </button>
            );
          })}
        </nav>

        {/* Divider & Logout */}
        <div className="p-4 space-y-2 border-t border-slate-800">
          <a
            href="/"
            className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition"
          >
            <Eye className="w-4 h-4" />
            <span>View User Dashboard</span>
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Top Bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white">
              {activeSection === "overview" ? "System Overview & KPIs" : "Registered User Directory"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              URL: <span className="font-mono text-indigo-300">localhost:3001/otnet-admin/dashboard</span>
              {" · "}
              <span className="text-amber-400 font-semibold">Admin-Only Zone</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadAdminData()}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>
            {activeSection === "users" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/30 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Operator</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          {/* Action Message */}
          {actionMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                actionMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {actionMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{actionMsg.text}</span>
            </div>
          )}

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {[
                  {
                    label: "Registered Users",
                    value: stats?.total_users ?? users.length,
                    icon: Users,
                    color: "text-indigo-400",
                    sub: "Active accounts",
                  },
                  {
                    label: "Active Tenants",
                    value: stats?.total_tenants ?? 1,
                    icon: Building,
                    color: "text-emerald-400",
                    sub: "Organizations",
                  },
                  {
                    label: "Managed Networks",
                    value: stats?.total_networks ?? 1,
                    icon: Database,
                    color: "text-sky-400",
                    sub: "Subnets & VPNs",
                  },
                  {
                    label: "Discovered Devices",
                    value: stats?.total_devices ?? 0,
                    icon: Server,
                    color: "text-amber-400",
                    sub: "Phones, PCs, Routers",
                  },
                  {
                    label: "DNS Queries Governed",
                    value: stats?.total_queries ?? 0,
                    icon: Shield,
                    color: "text-rose-400",
                    sub: "Audited & sinkholed",
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">{card.label}</span>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div className={`text-2xl font-bold font-mono mt-2 ${card.color}`}>
                        {card.value}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{card.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Access Shortcut to Users */}
              <div
                onClick={() => setActiveSection("users")}
                className="cursor-pointer bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 flex items-center justify-between hover:border-indigo-500/60 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Manage User Directory</div>
                    <div className="text-xs text-slate-400">View, edit roles, create and delete operator accounts</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>

              {/* System Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backend API</div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-emerald-400 text-sm">Operational</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">FastAPI · Port 8000</div>
                </div>

                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">DNS Guard Engine</div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="font-bold text-indigo-400 text-sm">Intercepting</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">0.0.0.0:53 · Upstream 1.1.1.1</div>
                </div>

                <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Portal</div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-bold text-amber-400 text-sm">Authenticated</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">/otnet-admin · Role: {adminRole}</div>
                </div>
              </div>
            </div>
          )}

          {/* Users Section */}
          {activeSection === "users" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Operator & User Directory
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign roles, create new operators, or revoke access.
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                  {users.length} users
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-950/40">
                      <th className="py-3 px-5">User</th>
                      <th className="py-3 px-5">Role</th>
                      <th className="py-3 px-5">Organization</th>
                      <th className="py-3 px-5">MFA</th>
                      <th className="py-3 px-5">Registered</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          {loading ? "Loading user directory…" : "No users found."}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-850/50 transition">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold uppercase text-xs">
                                {u.email[0]}
                              </span>
                              <span className="font-semibold text-white">{u.email}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                            >
                              <option value="owner">👑 Owner</option>
                              <option value="admin">🛡️ Admin</option>
                              <option value="analyst">📊 Analyst</option>
                              <option value="viewer">👁️ Viewer</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">{u.tenant_name}</td>
                          <td className="py-3.5 px-5">
                            {u.mfa_enabled ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                2FA Active
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                                Password Only
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-slate-400">
                            <ClientTime isoString={u.created_at} format="datetime" />
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add New Operator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Create Operator Account</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold w-7 h-7 flex items-center justify-center rounded"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="owner">👑 Owner</option>
                    <option value="admin">🛡️ Admin</option>
                    <option value="analyst">📊 Analyst</option>
                    <option value="viewer">👁️ Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization</label>
                  <input
                    type="text"
                    required
                    value={newTenant}
                    onChange={(e) => setNewTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  {submitting ? "Creating…" : "Save Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
