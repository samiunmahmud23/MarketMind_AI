"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  CreditCard,
  Clock,
  Check,
  Loader2,
  Zap,
  Crown,
  Lock,
  User,
  Mail,
  Calendar,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GlassCard, EmptyState } from "@/components/shared";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type Tab = "auth" | "billing" | "scheduler";

const TIER_ICONS: Record<string, any> = { free: Zap, starter: Check, pro: Crown, agency: Crown };

export function AccountSection() {
  const [tab, setTab] = React.useState<Tab>("auth");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex gap-2">
        {([
          { id: "auth" as Tab, label: "Authentication", icon: Shield },
          { id: "billing" as Tab, label: "Billing & Plans", icon: CreditCard },
          { id: "scheduler" as Tab, label: "Scheduled Jobs", icon: Clock },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("btn-press flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all",
              tab === t.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "auth" && <AuthTab />}
      {tab === "billing" && <BillingTab />}
      {tab === "scheduler" && <SchedulerTab />}
    </div>
  );
}

/* ============ Auth Tab ============ */

function AuthTab() {
  const [authEnabled, setAuthEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ email: "", password: "", name: "" });
  const [setting, setSetting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/api/auth/setup", { retries: 2 });
      setAuthEnabled(data.authEnabled);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function setup() {
    if (!form.email || !form.password) { toast.error("Email and password required"); return; }
    if (form.password.length < 6) { toast.error("Password must be 6+ characters"); return; }
    setSetting(true);
    try {
      const data = await apiFetch<any>("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      toast.success(data.message);
      setAuthEnabled(true);
    } catch (e: any) { toast.error(e.message); }
    finally { setSetting(false); }
  }

  if (loading) return <GlassCard className="p-8"><div className="h-32 animate-pulse bg-muted rounded" /></GlassCard>;

  return (
    <div className="space-y-4">
      <GlassCard strong className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", authEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
            {authEnabled ? <Shield className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-semibold">{authEnabled ? "Authentication Enabled" : "Demo Mode — No Auth"}</div>
            <div className="text-xs text-muted-foreground">{authEnabled ? "Login required to access the app." : "Anyone can access the app. Set up auth to protect it."}</div>
          </div>
        </div>

        {!authEnabled && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Admin name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Admin" /></Field>
              <Field label="Admin email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@marketmind.ai" /></Field>
            </div>
            <Field label="Password * (min 6 characters)"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></Field>
            <Button onClick={setup} disabled={setting} className="btn-press mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              {setting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />} Create Admin Account & Enable Auth
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3">
              Once auth is enabled, a login screen will appear before the app. Uses NextAuth.js with JWT sessions + bcrypt password hashing. The first admin gets a free Pro tier.
            </p>
          </>
        )}

        {authEnabled && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            ✓ Auth is active. The app now requires login. Use your admin email + password to sign in.
            <br />NextAuth.js handles sessions via JWT. Passwords are bcrypt-hashed (10 rounds).
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ============ Billing Tab ============ */

const TIERS = [
  { id: "free", name: "Free", price: 0, icon: Zap, color: "text-muted-foreground bg-muted", limits: { analyses: 10, campaigns: 5, emails: "50/mo", aiCalls: "100/mo" }, features: ["Website Analysis", "SEO Reports", "Copywriting", "Content Studio"] },
  { id: "starter", name: "Starter", price: 19, icon: Check, color: "text-emerald-600 bg-emerald-500/10", limits: { analyses: 50, campaigns: 25, emails: "500/mo", aiCalls: "500/mo" }, features: ["Everything in Free", "Real email sending", "Social Studio", "Lead Scoring", "Campaign Analytics"] },
  { id: "pro", name: "Pro", price: 49, icon: Crown, color: "text-violet-600 bg-violet-500/10", limits: { analyses: 200, campaigns: 100, emails: "5K/mo", aiCalls: "2K/mo" }, features: ["Everything in Starter", "Content Repurposing", "LangGraph + RAG", "Scheduled emails", "Priority support"] },
  { id: "agency", name: "Agency", price: 149, icon: Crown, color: "text-amber-600 bg-amber-500/10", limits: { analyses: "∞", campaigns: "∞", emails: "50K/mo", aiCalls: "∞" }, features: ["Everything in Pro", "Unlimited everything", "White-label", "Multi-brand", "API access"] },
];

function BillingTab() {
  const [currentTier, setCurrentTier] = React.useState("pro");
  const [subscribing, setSubscribing] = React.useState<string | null>(null);
  const [demoMode, setDemoMode] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<any>("/api/billing/subscribe", { retries: 2 });
        setCurrentTier(data.tier || "pro");
        setDemoMode(data.demoMode ?? true);
      } catch { /* non-fatal */ }
    })();
  }, []);

  async function subscribe(tierId: string) {
    setSubscribing(tierId);
    try {
      // Paid tiers → try real Stripe Checkout first (redirects to Stripe's page).
      if (tierId !== "free") {
        try {
          const res = await apiFetch<any>("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: tierId }),
            retries: 1,
          });
          if (res?.url) {
            window.location.assign(res.url);
            return;
          }
        } catch (e: any) {
          // Stripe not configured → fall through to the demo flow; otherwise surface it.
          if (!/not configured/i.test(e?.message || "")) throw e;
        }
      }
      // Free tier, or Stripe not configured → demo tier update (no payment).
      const data = await apiFetch<any>("/api/billing/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: tierId }) });
      toast.success(data.message);
      setCurrentTier(tierId);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubscribing(null); }
  }

  // After returning from Stripe Checkout (?billing=success|cancel), confirm + clean the URL.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const b = p.get("billing");
    if (b === "success") toast.success("Payment successful — your plan is being activated.");
    else if (b === "cancel") toast.info("Checkout canceled — no charge was made.");
    if (b) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <div className="space-y-4">
      <GlassCard strong className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">{currentTier.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">{demoMode ? "Demo mode — no payment required" : "Active subscription"}</span>
          </div>
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier, i) => {
          const Icon = tier.icon;
          const isCurrent = currentTier === tier.id;
          return (
            <motion.div key={tier.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard strong className={cn("p-5 relative", isCurrent && "ring-2 ring-primary")}>
                {isCurrent && <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground text-[10px]">CURRENT</Badge>}
                <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", tier.color)}><Icon className="h-4.5 w-4.5" /></div>
                <div className="mt-3 text-lg font-bold tracking-tight">{tier.name}</div>
                <div className="text-3xl font-bold tracking-tight mt-1">${tier.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <div className="mt-4 space-y-1.5 text-xs">
                  {Object.entries(tier.limits).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-muted-foreground"><span className="capitalize">{k}</span><span className="font-medium text-foreground tabular-nums">{v}</span></div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  {tier.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs"><Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" /><span className="text-muted-foreground">{f}</span></div>
                  ))}
                </div>
                <Button
                  onClick={() => subscribe(tier.id)}
                  disabled={isCurrent || subscribing === tier.id}
                  className={cn("btn-press mt-4 w-full", isCurrent ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700")}
                >
                  {subscribing === tier.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isCurrent ? <Check className="h-4 w-4 mr-2" /> : null}
                  {isCurrent ? "Current Plan" : `Upgrade to ${tier.name}`}
                </Button>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <GlassCard className="p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Stripe integration ready:</span> Add <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">STRIPE_SECRET_KEY</code> to your environment variables and replace the subscribe endpoint with Stripe checkout session creation. The pricing tiers, limits, and feature gating are already built.
        </p>
      </GlassCard>
    </div>
  );
}

/* ============ Scheduler Tab ============ */

function SchedulerTab() {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = React.useState("");
  const [scheduledFor, setScheduledFor] = React.useState("");
  const [scheduling, setScheduling] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jobsData, campsData] = await Promise.all([
        apiFetch<any[]>("/api/scheduled-jobs", { retries: 2 }).catch(() => []),
        apiFetch<any[]>("/api/campaigns", { retries: 2 }).catch(() => []),
      ]);
      setJobs(jobsData);
      setCampaigns(campsData.filter((c) => c.selectedVariantId && c.recipientCount > 0 && c.status !== "sent"));
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Poll for due jobs every 60s
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try { await apiFetch("/api/scheduled-jobs/process", { method: "POST", retries: 0 }); load(); } catch { /* non-fatal */ }
    }, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function schedule() {
    if (!selectedCampaign || !scheduledFor) { toast.error("Select a campaign and time"); return; }
    setScheduling(true);
    try {
      await apiFetch("/api/scheduled-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: selectedCampaign, scheduledFor }) });
      toast.success("Campaign scheduled");
      setSelectedCampaign(""); setScheduledFor("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setScheduling(false); }
  }

  async function cancel(id: string) {
    try { await apiFetch(`/api/scheduled-jobs?id=${id}`, { method: "DELETE", json: false }); toast.success("Canceled"); load(); }
    catch { toast.error("Cancel failed"); }
  }

  async function processNow() {
    try {
      const data = await apiFetch<any>("/api/scheduled-jobs/process", { method: "POST", retries: 1 });
      toast.success(`Processed ${data.processed} jobs`);
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <GlassCard strong className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Schedule a Campaign</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Campaign (must have selected draft + recipients)">
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Select campaign…</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.recipientCount} recipients)</option>)}
            </select>
          </Field>
          <Field label="Send at (date & time)">
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </Field>
        </div>
        <Button onClick={schedule} disabled={scheduling} className="btn-press mt-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
          {scheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />} Schedule Send
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2">
          Scheduled jobs are processed automatically every 60 seconds when the dashboard is open. For production, set up an external cron that POSTs to <code className="bg-muted px-1 rounded text-[10px] font-mono">/api/scheduled-jobs/process</code>.
        </p>
      </GlassCard>

      {jobs.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Scheduled Jobs ({jobs.length})</h3>
            <Button size="sm" variant="outline" onClick={processNow} className="btn-press h-7 text-xs">Process Due Jobs Now</Button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{job.campaign?.name || "Unknown campaign"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(job.scheduledFor).toLocaleString()}</div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] capitalize",
                  job.status === "pending" ? "text-amber-600 border-amber-500/20" :
                  job.status === "completed" ? "text-emerald-600 border-emerald-500/20" :
                  job.status === "failed" ? "text-rose-600 border-rose-500/20" :
                  job.status === "running" ? "text-sky-600 border-sky-500/20" : "text-muted-foreground")}>{job.status}</Badge>
                {job.status === "pending" && <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => cancel(job.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {jobs.length === 0 && !loading && (
        <EmptyState icon={<Clock className="h-8 w-8" />} title="No scheduled jobs" description="Schedule a campaign to be sent automatically at a future time. Jobs are processed every 60 seconds." />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label className="text-xs font-medium">{label}</Label>{children}</div>);
}
