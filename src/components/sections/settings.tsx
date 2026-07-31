"use client";

import * as React from "react";
import {
  Settings,
  Plus,
  Trash2,
  Loader2,
  Star,
  Check,
  Building2,
  Palette,
  Megaphone,
  Mail,
  Server,
  Plug,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "luxury", label: "Luxury" },
  { value: "casual", label: "Casual" },
  { value: "bold", label: "Bold" },
];

const PRESET_COLORS = ["#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444"];

export function SettingsSection() {
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/brand-profiles", { retries: 3 });
      setProfiles(data);
      if (data.length > 0 && !editing) setEditing(data[0]);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [editing]);

  React.useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.name) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    try {
      // Parse keywords from the raw text buffer (in case the user hasn't
      // blurred the field yet) so nothing typed is lost on save.
      const keywords = keywordsText.split(",").map((s) => s.trim()).filter(Boolean);
      const payload = {
        ...editing,
        keywords,
      };
      if (editing.id) {
        await apiFetch(`/api/brand-profiles/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Brand profile updated");
      } else {
        const created = await apiFetch<any>("/api/brand-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Brand profile created");
        setEditing({ ...created, keywords: created.keywords || [] });
      }
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    try {
      await apiFetch(`/api/brand-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      toast.success("Set as default");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteProfile(id: string) {
    try {
      await apiFetch(`/api/brand-profiles/${id}`, { method: "DELETE", json: false });
      toast.success("Deleted");
      if (editing?.id === id) setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function newProfile() {
    setEditing({
      name: "",
      website: "",
      industry: "",
      audience: "",
      valueProp: "",
      tone: "professional",
      voice: "",
      keywords: [],
      primaryColor: "#10b981",
      logoUrl: "",
      isDefault: false,
    });
  }

  // Keep a raw text buffer for the keywords input so the user can type
  // commas/spaces freely. The array is parsed on blur (and on save).
  const keywordsInputRef = React.useRef<HTMLInputElement>(null);
  const [keywordsText, setKeywordsText] = React.useState("");
  React.useEffect(() => {
    setKeywordsText(
      Array.isArray(editing?.keywords) ? editing.keywords.join(", ") : editing?.keywords || ""
    );
  }, [editing?.id]); // re-sync when switching profiles, not on every keystroke

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand Profiles &amp; Settings</h2>
          <p className="text-sm text-muted-foreground">Configure reusable brand profiles — used as defaults across all agents.</p>
        </div>
        <Button onClick={newProfile} className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950">
          <Plus className="h-4 w-4 mr-1.5" /> New Profile
        </Button>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      ) : profiles.length === 0 && !editing ? (
        <EmptyState
          icon={<Settings className="h-10 w-10" />}
          title="No brand profiles yet"
          description="Create a brand profile with your default tone, audience, value proposition and keywords. Agents will use these as sensible defaults across campaigns."
          action={<Button onClick={newProfile}><Plus className="h-4 w-4 mr-1.5" /> New Profile</Button>}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Profile list */}
          <div className="space-y-2">
            {profiles.map((p) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setEditing({ ...p, keywords: p.keywords || [] })}
                className={cn(
                  "w-full text-left rounded-lg border-2 p-3 transition-all",
                  editing?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md text-white text-xs font-bold shrink-0" style={{ backgroundColor: p.primaryColor || "#10b981" }}>
                    {p.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.industry || p.website || "—"}</div>
                  </div>
                  {p.isDefault && (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </div>
              </motion.button>
            ))}
            {profiles.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No profiles yet
              </div>
            )}
          </div>

          {/* Editor */}
          {editing && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {editing.id ? "Edit Profile" : "New Profile"}
                </CardTitle>
                {editing.id && (
                  <div className="flex items-center gap-1.5">
                    {!editing.isDefault && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDefault(editing.id)}>
                        <Star className="h-3 w-3 mr-1" /> Set default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteProfile(editing.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Brand name *">
                    <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Acme Inc" />
                  </Field>
                  <Field label="Website">
                    <Input value={editing.website || ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} placeholder="https://acme.com" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Industry">
                    <Input value={editing.industry || ""} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} placeholder="SaaS / E-commerce / Agency" />
                  </Field>
                  <Field label="Target audience">
                    <Input value={editing.audience || ""} onChange={(e) => setEditing({ ...editing, audience: e.target.value })} placeholder="Early-stage SaaS founders" />
                  </Field>
                </div>
                <Field label="Value proposition">
                  <Input value={editing.valueProp || ""} onChange={(e) => setEditing({ ...editing, valueProp: e.target.value })} placeholder="We help [audience] achieve [outcome] without [pain]" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Default tone">
                    <Select value={editing.tone} onValueChange={(v) => setEditing({ ...editing, tone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Logo URL (optional)">
                    <Input value={editing.logoUrl || ""} onChange={(e) => setEditing({ ...editing, logoUrl: e.target.value })} placeholder="https://..." />
                  </Field>
                </div>
                <Field label="Brand voice description">
                  <Textarea value={editing.voice || ""} onChange={(e) => setEditing({ ...editing, voice: e.target.value })} placeholder="Confident but not arrogant. Uses concrete numbers. Avoids hype words." rows={2} />
                </Field>
                <Field label="Target keywords (comma-separated)">
                  <Input
                    ref={keywordsInputRef}
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    onBlur={() => {
                      const arr = keywordsText.split(",").map((s) => s.trim()).filter(Boolean);
                      setEditing({ ...editing, keywords: arr });
                    }}
                    placeholder="ai marketing, cold email, saas growth"
                  />
                  {Array.isArray(editing.keywords) && editing.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {editing.keywords.map((k: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Primary brand color">
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditing({ ...editing, primaryColor: c })}
                        className={cn("h-7 w-7 rounded-full border-2 transition-all", editing.primaryColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      >
                        {editing.primaryColor === c && <Check className="h-3.5 w-3.5 text-white mx-auto" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={editing.primaryColor || "#10b981"}
                      onChange={(e) => setEditing({ ...editing, primaryColor: e.target.value })}
                      className="h-7 w-7 rounded cursor-pointer border border-border"
                    />
                  </div>
                </Field>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Used as defaults across all agents</span>
                  </div>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {editing.id ? "Save changes" : "Create profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Email Sending / SMTP Configuration */}
      <SmtpCard />

      {/* Agent config info card */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> How brand profiles work</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            { title: "Auto-applied", desc: "When you create a campaign or content project, the default profile's tone, audience and keywords pre-fill the form." },
            { title: "Per-agent", desc: "Each agent (EmailCopywriter, ContentStrategist, etc.) reads the brand voice to keep messaging consistent." },
            { title: "Multiple brands", desc: "Manage unlimited brand profiles for different clients — ideal for agencies. Star one as default." },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-border p-3">
              <div className="text-sm font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

const SMTP_PRESETS = [
  { name: "Gmail", host: "smtp.gmail.com", port: 587, secure: false, note: "Use a Gmail App Password (not your regular password). Enable 2FA → Security → App passwords." },
  { name: "Outlook / Office365", host: "smtp.office365.com", port: 587, secure: false, note: "Use your Microsoft account password or app password." },
  { name: "Yahoo", host: "smtp.mail.yahoo.com", port: 587, secure: false, note: "Requires a Yahoo app password." },
  { name: "Zoho", host: "smtp.zoho.com", port: 587, secure: false, note: "Requires a Zoho app password." },
  { name: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: 587, secure: false, note: "Free 300 emails/day. Use your Brevo SMTP key." },
  { name: "SSL (port 465)", host: "", port: 465, secure: true, note: "For providers that use implicit SSL on port 465." },
];

function SmtpCard() {
  const [config, setConfig] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = React.useState({
    id: "",
    provider: "web3forms" as "smtp" | "web3forms",
    host: "",
    port: "587",
    secure: false,
    user: "",
    pass: "",
    web3formsKey: "",
    fromName: "MarketMind AI",
    fromEmail: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/api/smtp-config", { retries: 2 });
      if (data) {
        setConfig(data);
        setForm({
          id: data.id || "",
          provider: data.provider || "smtp",
          host: data.host || "",
          port: String(data.port || 587),
          secure: !!data.secure,
          user: data.user || "",
          pass: "", // never pre-fill password
          web3formsKey: data.web3formsKey || "",
          fromName: data.fromName || "MarketMind AI",
          fromEmail: data.fromEmail || "",
        });
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function applyPreset(preset: typeof SMTP_PRESETS[0]) {
    setForm((f) => ({
      ...f,
      host: preset.host || f.host,
      port: String(preset.port),
      secure: preset.secure,
      fromEmail: f.fromEmail || f.user,
    }));
    if (preset.note) toast.info(preset.note);
  }

  async function save() {
    if (!form.fromEmail) {
      toast.error("From email is required");
      return;
    }
    if (form.provider === "smtp") {
      if (!form.host || !form.user) {
        toast.error("For SMTP: host and username are required");
        return;
      }
      if (!form.id && !form.pass) {
        toast.error("Password / app password is required for new SMTP config");
        return;
      }
    } else if (form.provider === "web3forms") {
      if (!form.web3formsKey) {
        toast.error("Web3Forms access key is required");
        return;
      }
    }
    setSaving(true);
    setTestResult(null);
    try {
      await apiFetch("/api/smtp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success(form.provider === "web3forms" ? "Web3Forms settings saved" : "SMTP settings saved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (form.provider === "web3forms") {
      if (!form.web3formsKey) {
        toast.error("Web3Forms access key is required to test");
        return;
      }
    } else {
      if (!form.host || !form.user || !form.pass) {
        toast.error("Host, username, and password required to test SMTP");
        return;
      }
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Web3Forms free tier BLOCKS server-side calls (403 "Pro plan required"),
      // so we test it directly from the browser (client-side).
      if (form.provider === "web3forms") {
        const { testWeb3FormsClient } = await import("@/lib/web3forms-client");
        const result = await testWeb3FormsClient(form.web3formsKey, form.fromEmail || "test@marketmind.ai");
        setTestResult(result);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } else {
        // SMTP test runs server-side (Nodemailer transporter.verify())
        const result = await apiFetch<{ ok: boolean; message: string }>("/api/smtp-config/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setTestResult(result);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    try {
      await apiFetch("/api/smtp-config", { method: "DELETE", json: false });
      toast.success("Email settings removed");
      setConfig(null);
      setForm({ id: "", provider: "web3forms", host: "", port: "587", secure: false, user: "", pass: "", web3formsKey: "", fromName: "MarketMind AI", fromEmail: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-600" /> Email Sending
            {config && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" /> {config.provider === "web3forms" ? "Web3Forms" : "SMTP"}
              </Badge>
            )}
          </CardTitle>
          {config && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={remove}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            {/* Status banner */}
            {!config && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Email sending not configured.</span> Real emails won't be delivered until you add either a Web3Forms access key (easiest — free 250/month, no app password) or SMTP credentials.
                </div>
              </div>
            )}
            {config && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">Ready to send.</span> Emails will be sent from <span className="font-mono">{config.fromEmail}</span> via {config.provider === "web3forms" ? <span className="font-mono">Web3Forms</span> : <span className="font-mono">{config.host}</span>}.
                  {config.provider === "web3forms" && " Free tier: 250 emails/month."}
                </div>
              </div>
            )}

            {/* Provider selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email provider</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, provider: "web3forms" })}
                  className={cn("rounded-lg border-2 p-3 text-left transition-all", form.provider === "web3forms" ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:bg-muted")}
                >
                  <div className="flex items-center gap-2">
                    <Plug className={cn("h-4 w-4", form.provider === "web3forms" ? "text-emerald-600" : "text-muted-foreground")} />
                    <span className="text-sm font-semibold">Web3Forms</span>
                    {form.provider === "web3forms" && <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Easiest · free 250/month · no app password · public access key</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, provider: "smtp" })}
                  className={cn("rounded-lg border-2 p-3 text-left transition-all", form.provider === "smtp" ? "border-sky-500 bg-sky-500/5" : "border-border hover:bg-muted")}
                >
                  <div className="flex items-center gap-2">
                    <Server className={cn("h-4 w-4", form.provider === "smtp" ? "text-sky-600" : "text-muted-foreground")} />
                    <span className="text-sm font-semibold">SMTP</span>
                    {form.provider === "smtp" && <Check className="h-3.5 w-3.5 text-sky-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Direct delivery · Gmail/Outlook · higher volume · needs app password</p>
                </button>
              </div>
            </div>

            {/* Web3Forms fields */}
            {form.provider === "web3forms" ? (
              <>
                <Field label="Web3Forms Access Key *">
                  <Input value={form.web3formsKey} onChange={(e) => setForm({ ...form, web3formsKey: e.target.value })} placeholder="your-public-access-key-xxxxxxxx" className="font-mono text-xs" />
                </Field>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">How to get a free Web3Forms access key:</span>
                  <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                    <li>Go to <a href="https://web3forms.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">web3forms.com</a></li>
                    <li>Enter your email → click "Create Access Key"</li>
                    <li>Check your inbox for the access key</li>
                    <li>Paste it above</li>
                  </ol>
                  The access key is <span className="font-semibold">public and safe to expose</span> — it can only receive form inputs, never read/delete data. Free plan: 250 submissions/month.
                  <br /><br />
                  <span className="font-semibold text-foreground">How delivery works:</span> Web3Forms sends each email to your registered inbox with the recipient CC'd, so they receive it too. You also get a copy as a send record.
                </div>
              </>
            ) : (
              <>
                {/* SMTP presets */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> Quick presets</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SMTP_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="text-[11px] rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="SMTP host *">
                    <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" />
                  </Field>
                  <Field label="Port *">
                    <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value, secure: e.target.value === "465" })} placeholder="587" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Username / email *">
                    <Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value, fromEmail: form.fromEmail || e.target.value })} placeholder="you@gmail.com" />
                  </Field>
                  <Field label={form.id ? "Password / app password (leave blank to keep existing)" : "Password / app password *"}>
                    <Input type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} placeholder={form.id ? "••••••••" : "Your SMTP password or app password"} />
                  </Field>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <input type="checkbox" id="smtp-secure" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} className="rounded" />
                  <label htmlFor="smtp-secure" className="text-muted-foreground cursor-pointer">
                    Use SSL (port 465). Leave unchecked for STARTTLS (port 587, recommended for Gmail/Outlook).
                  </label>
                </div>
              </>
            )}

            {/* Shared fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="From name">
                <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="MarketMind AI" />
              </Field>
              <Field label="From email * (also your Web3Forms reply-to)">
                <Input type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="you@gmail.com" />
              </Field>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={cn("rounded-lg p-3 text-xs flex items-start gap-2", testResult.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>
                {testResult.ok ? <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Plug className="h-3.5 w-3.5" />
                <span>Test verifies the connection without saving</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={test}
                  disabled={testing || (form.provider === "web3forms" ? !form.web3formsKey : !form.host || !form.user || !form.pass)}
                >
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />} Test
                </Button>
                <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save settings
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
