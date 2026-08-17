"use client";

import * as React from "react";
import { Users, Activity, CreditCard, Mail, Shield, BarChart, Server, Check, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

export function AdminSection() {
  const [stats, setStats] = React.useState<any>(null);
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"overview" | "users">("overview");

  React.useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/users")
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function updateTier(userId: string, newTier: string) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscriptionTier: newTier }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, subscriptionTier: newTier } : u));
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <div className="text-destructive">Failed to load admin data.</div>;

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform management and insights</p>
        </div>
        <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "overview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "users" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Users
          </button>
        </div>
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="var(--brand-indigo)" />
            <StatCard title="Analyses Run" value={stats.usage.analyses} icon={BarChart} color="var(--brand-blue)" />
            <StatCard title="Campaigns" value={stats.usage.campaigns} icon={Mail} color="var(--brand-rose)" />
            <StatCard title="AI Generations" value={stats.usage.aiCalls} icon={Activity} color="var(--brand-mint)" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Tiers Breakdown */}
            <div className="elite-glass rounded-2xl border border-border p-5">
              <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Subscription Tiers
              </h3>
              <div className="space-y-3">
                {stats.tiers.map((t: any) => (
                  <div key={t.tier} className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium">{t.tier}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(t.count / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums min-w-[2rem] text-right">
                        {t.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="elite-glass rounded-2xl border border-border p-5">
              <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Database (Supabase)</div>
                      <div className="text-xs text-muted-foreground">Connected & synced</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-500">Active</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">LLM Endpoints (Groq)</div>
                      <div className="text-xs text-muted-foreground">Operational</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-500">Active</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "users" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="elite-glass rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tier</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Usage (AI / Emails)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.name || "Anonymous"}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-indigo/10 px-2 py-0.5 text-xs font-medium text-brand-indigo">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize outline-none focus:ring-2 focus:ring-primary"
                          value={user.subscriptionTier}
                          onChange={(e) => updateTier(user.id, e.target.value)}
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="agency">Agency</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {user.aiCallsUsed} / {user.emailsSent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="elite-glass flex flex-col rounded-2xl border border-border p-5 relative overflow-hidden group">
      <div 
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.08] transition-transform duration-500 group-hover:scale-150"
        style={{ background: color }}
      />
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" style={{ color }} />
        {title}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
