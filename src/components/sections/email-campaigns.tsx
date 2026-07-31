"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import {
  Mail,
  Plus,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  Users,
  FileText,
  ChevronLeft,
  Copy,
  Search,
  ListChecks,
  Send,
  Target,
  Flame,
  BarChart3,
  MousePointerClick,
  Eye,
  MailCheck,
  MailX,
  Building2,
  Check,
  ImageIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EmptyState, ErrorState, CopyButton } from "@/components/shared";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

const GEN_STEPS = [
  "Analyzing product picture (if uploaded) via vision model",
  "Researching SEO keywords via web-search",
  "Drafting your cold email variants with distinct angles",
  "Personalizing with {{first_name}} tokens for each recipient",
];

/* ============================================================
   Presentation primitives — elite depth cards + motion
   ============================================================ */

const EASE = [0.22, 1, 0.36, 1] as const;

const staggerGrid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/** Deep layered depth card — matte fill, hairline edge, optional lift + lit edge. */
function Panel({
  className,
  children,
  hover,
  lit,
  onClick,
  glowColor,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  lit?: boolean;
  onClick?: () => void;
  glowColor?: string;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
      className={cn(
        "relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm",
        hover && "card-hover cursor-pointer",
        lit && "border-lit",
        className
      )}
      style={glowColor ? { boxShadow: `0 0 0 1px color-mix(in oklch, ${glowColor} 22%, transparent), 0 14px 40px -14px color-mix(in oklch, ${glowColor} 30%, transparent)` } : undefined}
    >
      {children}
    </div>
  );
}

/** Section eyebrow header used across the workspace. */
function PanelTitle({ icon: Icon, children, accent = "var(--brand-indigo)", right }: { icon: any; children: React.ReactNode; accent?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">{children}</span>
      </div>
      {right}
    </div>
  );
}

/** Sliding segmented control — replaces raw shadcn Select for enum params. */
function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const gid = React.useId();
  return (
    <div
      className="grid gap-1 rounded-xl border border-border bg-muted/40 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "relative rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              active ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${gid}`}
                className="absolute inset-0 rounded-lg"
                style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EmailCampaignsSection() {
  const [view, setView] = React.useState<"list" | "new" | "detail">("list");
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any[]>("/api/campaigns", { retries: 3 });
      setCampaigns(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't load your campaigns.";
      setError(msg);
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  async function deleteCampaign(id: string) {
    try {
      await apiFetch(`/api/campaigns/${id}`, { method: "DELETE", json: false });
      setCampaigns((c) => c.filter((x) => x.id !== id));
      toast.success("Campaign deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {view === "list" && (
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="space-y-6"
        >
          {/* Hero header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
                style={{ background: "color-mix(in oklch, var(--brand-indigo) 10%, transparent)", color: "var(--brand-indigo)" }}
              >
                <Sparkles className="h-3 w-3" /> EmailCopywriter agent
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Cold Email Campaigns</h2>
              <p className="text-sm text-muted-foreground">Upload a CSV, generate SEO-based A/B emails, score leads, and send — personalized by name.</p>
            </div>
            <button
              onClick={() => setView("new")}
              className="btn-press inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-lg transition-transform"
              style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
            >
              <Plus className="h-4 w-4" /> New Campaign
            </button>
          </div>

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-premium h-28 rounded-2xl" />
              ))}
            </div>
          ) : error && campaigns.length === 0 ? (
            <ErrorState
              title="Couldn't load campaigns"
              description={error}
              onRetry={load}
              retrying={loading}
            />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-10 w-10" />}
              title="No campaigns yet"
              description="Create your first cold email campaign. Upload a CSV of leads and let the EmailCopywriter agent generate A/B variants."
              action={
                <button
                  onClick={() => setView("new")}
                  className="btn-press inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
                >
                  <Plus className="h-4 w-4" /> New Campaign
                </button>
              }
            />
          ) : (
            <motion.div variants={staggerGrid} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((c) => (
                <motion.div key={c.id} variants={staggerItem}>
                  <Panel hover onClick={() => openDetail(c.id)} className="group h-full p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold tracking-tight">{c.name}</h3>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.productName} · {c.targetAudience}</p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-indigo)]" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <MiniStat icon={Users} value={c.recipientCount} label="recipients" />
                      <MiniStat icon={Mail} value={c.variantCount} label="variants" />
                      <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{c.tone}</span>
                    </div>
                    {c.seoKeywords?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {c.seoKeywords.slice(0, 3).map((k: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-md px-1.5 py-0.5 text-[10px]"
                            style={{ background: "color-mix(in oklch, var(--brand-mint) 12%, transparent)", color: "var(--brand-mint)" }}
                          >
                            {k}
                          </span>
                        ))}
                        {c.seoKeywords.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.seoKeywords.length - 3}</span>}
                      </div>
                    )}
                  </Panel>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {view === "new" && (
        <NewCampaignForm
          onBack={() => setView("list")}
          onCreated={(id) => {
            load();
            openDetail(id);
          }}
        />
      )}

      {view === "detail" && selectedId && (
        <CampaignDetail id={selectedId} onBack={() => { setView("list"); load(); }} />
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string; pulse?: boolean }> = {
    draft: { color: "var(--muted-foreground)", label: "Draft" },
    generating: { color: "var(--brand-amber)", label: "Generating", pulse: true },
    ready: { color: "var(--brand-mint)", label: "Ready" },
    sent: { color: "var(--brand-cyan)", label: "Sent" },
  };
  const m = map[status] || map.draft;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: `color-mix(in oklch, ${m.color} 15%, transparent)`, color: m.color }}
    >
      {m.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: m.color }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
        </span>
      )}
      {m.label}
    </span>
  );
}

function NewCampaignForm({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = React.useState({
    name: "",
    productName: "",
    productDesc: "",
    targetAudience: "",
    valueProp: "",
    goal: "leads",
    tone: "professional",
    seoKeywords: "",
    draftCount: "2",
  });
  const [saving, setSaving] = React.useState(false);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = React.useState<string>("");
  const [productImage, setProductImage] = React.useState<string>("");
  const [imageFileName, setImageFileName] = React.useState<string>("");
  const imgInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<any[]>("/api/brand-profiles", { retries: 2 });
        setProfiles(data);
        const def = data.find((p) => p.isDefault) || data[0];
        if (def) applyProfile(def);
      } catch {
        // non-fatal — form works without profiles
      }
    })();
  }, []);

  function applyProfile(p: any) {
    setSelectedProfile(p.id);
    setForm((f) => ({
      ...f,
      productName: f.productName || p.name || "",
      targetAudience: f.targetAudience || p.audience || "",
      valueProp: f.valueProp || p.valueProp || "",
      tone: p.tone || f.tone,
      seoKeywords: f.seoKeywords || (p.keywords?.length ? p.keywords.join(", ") : ""),
    }));
    if (p.name) toast.info(`Applied brand profile: ${p.name}`);
  }

  async function submit() {
    if (!form.name || !form.productName || !form.targetAudience) {
      toast.error("Name, product, and audience are required");
      return;
    }
    setSaving(true);
    try {
      const seoKeywords = form.seoKeywords.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await apiFetch<any>("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seoKeywords, productImage: productImage || undefined }),
      });
      toast.success("Campaign created");
      onCreated(data.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mx-auto max-w-4xl space-y-4">
      <button onClick={onBack} className="btn-press inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <Panel lit className="overflow-hidden">
        {/* Header band */}
        <div className="relative flex items-center gap-3 border-b border-border px-6 py-5">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--brand-indigo)" }}
          />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}>
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Create Cold Email Campaign</h3>
            <p className="text-xs text-muted-foreground">Configure the agent's parameters — it drafts distinct angles you pick from.</p>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {profiles.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
              style={{ borderColor: "color-mix(in oklch, var(--brand-indigo) 25%, transparent)", background: "color-mix(in oklch, var(--brand-indigo) 6%, transparent)" }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: "var(--brand-indigo)" }} />
                <span className="text-xs font-medium">Brand profile</span>
                <span className="text-[11px] text-muted-foreground">— auto-fills tone, audience, keywords &amp; value prop.</span>
              </div>
              <Select value={selectedProfile} onValueChange={(v) => { const p = profiles.find((x) => x.id === v); if (p) applyProfile(p); }}>
                <SelectTrigger className="h-8 w-56 rounded-lg text-xs"><SelectValue placeholder="Select brand…" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.primaryColor || "#6971ff" }} />
                        {p.name}{p.isDefault ? " ★" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Field label="Campaign name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q1 SaaS Founder Outreach" className="h-11 rounded-xl" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product / service name *">
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="MarketMind AI" className="h-11 rounded-xl" />
            </Field>
            <Field label="Target audience *">
              <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="Early-stage SaaS founders" className="h-11 rounded-xl" />
            </Field>
          </div>
          <Field label="Product description">
            <Textarea value={form.productDesc} onChange={(e) => setForm({ ...form, productDesc: e.target.value })} placeholder="What does the product do? Key features, pricing, differentiators." rows={3} className="rounded-xl" />
          </Field>
          <Field label="Value proposition">
            <Input value={form.valueProp} onChange={(e) => setForm({ ...form, valueProp: e.target.value })} placeholder="We help [audience] achieve [outcome] without [pain]" className="h-11 rounded-xl" />
          </Field>
          <Field label="SEO keywords (comma-separated, optional — agent will research if empty)">
            <Input value={form.seoKeywords} onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })} placeholder="cold email, saas growth, lead gen" className="h-11 rounded-xl" />
          </Field>

          {/* Draft-count "slider" — custom segmented AI parameter */}
          <Field label="How many draft emails to generate?">
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3"].map((n) => {
                const active = form.draftCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, draftCount: n })}
                    className={cn(
                      "btn-press relative overflow-hidden rounded-xl border p-3 text-center transition-colors",
                      active ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="draft-count-fill"
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 block text-2xl font-bold tabular-nums">{n}</span>
                    <span className="relative z-10 text-[10px] uppercase tracking-wide">draft{n !== "1" ? "s" : ""}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">The agent writes {form.draftCount} distinct draft{form.draftCount !== "1" ? "s" : ""} with different angles (pain / outcome / authority). You pick the best one before sending.</p>
          </Field>

          {/* Product picture upload */}
          <Field label="Product picture (optional — the AI will analyze it to write more specific emails)">
            {productImage ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <img src={productImage} alt="Product" className="h-16 w-16 rounded-lg border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{imageFileName || "Product image"}</div>
                  <div className="text-[11px] text-muted-foreground">Image attached — will be analyzed by the vision model</div>
                </div>
                <button type="button" className="btn-press inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:text-destructive" onClick={() => { setProductImage(""); setImageFileName(""); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload a product picture"
                onClick={() => imgInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); imgInputRef.current?.click(); } }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-[color-mix(in_oklch,var(--brand-indigo)_50%,transparent)] hover:bg-muted/30"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Click to upload a product picture</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">PNG/JPG/WebP · the vision model describes it for the copywriter</p>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 4 * 1024 * 1024) {
                toast.error("Image too large (max 4MB)");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => { setProductImage(reader.result as string); setImageFileName(f.name); };
              reader.readAsDataURL(f);
            }} />
          </Field>

          {/* Goal + Tone — custom sliding segmented switches (replace shadcn Select) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign goal">
              <Segmented
                value={form.goal}
                onChange={(v) => setForm({ ...form, goal: v })}
                options={[
                  { value: "leads", label: "Leads" },
                  { value: "conversions", label: "Convert" },
                  { value: "traffic", label: "Traffic" },
                  { value: "awareness", label: "Awareness" },
                ]}
              />
            </Field>
            <Field label="Tone">
              <Segmented
                value={form.tone}
                onChange={(v) => setForm({ ...form, tone: v })}
                options={[
                  { value: "professional", label: "Pro" },
                  { value: "friendly", label: "Friendly" },
                  { value: "urgent", label: "Urgent" },
                  { value: "luxury", label: "Luxury" },
                  { value: "casual", label: "Casual" },
                ]}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onBack} className="btn-press inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-press inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Campaign
            </button>
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CampaignDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [campaign, setCampaign] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [genStep, setGenStep] = React.useState(0);
  const [csvText, setCsvText] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [recipients, setRecipients] = React.useState<any[]>([]);
  const [recipientTotal, setRecipientTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [scoring, setScoring] = React.useState(false);
  const [scoreSummary, setScoreSummary] = React.useState<{ hot: number; warm: number; cold: number; avgScore: number } | null>(null);
  const [analytics, setAnalytics] = React.useState<any | null>(null);
  const [sending, setSending] = React.useState(false);
  const [smtpStatus, setSmtpStatus] = React.useState<{ configured: boolean; provider?: string; fromEmail?: string; fromName?: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [refreshing, setRefreshing] = React.useState(false);
  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    // Only show the full-page skeleton on the initial load; subsequent
    // refreshes (after upload/generate/send/score) use a non-blocking
    // `refreshing` state so the UI doesn't flash to a skeleton.
    if (opts?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await apiFetch<any>(`/api/campaigns/${id}`, { retries: 3 });
      setCampaign(data);
      setRecipients(data.recipients || []);
      setRecipientTotal(data.recipientCount || 0);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (campaign) loadAnalytics();
  }, [campaign]);

  // Load SMTP status once on mount
  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<any>("/api/dashboard", { retries: 2 });
        setSmtpStatus(data.smtp);
      } catch {
        // non-fatal
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!generating) return;
    setGenStep(0);
    const timers: any[] = [];
    GEN_STEPS.forEach((_, i) => timers.push(setTimeout(() => setGenStep(i), i * 4000)));
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  async function uploadCsv(file?: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      else if (csvText.trim()) fd.append("text", csvText);
      else {
        toast.error("Choose a file or paste CSV text");
        setUploading(false);
        return;
      }
      const data = await apiFetch<any>(`/api/campaigns/${id}/upload-csv`, { method: "POST", body: fd });
      toast.success(`Imported ${data.imported} recipients`);
      setCsvText("");
      load({ silent: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function generateEmails() {
    setGenerating(true);
    try {
      await apiFetch(`/api/campaigns/${id}/generate`, { method: "POST", retries: 1 });
      toast.success("Emails generated");
      load({ silent: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function scoreLeads() {
    setScoring(true);
    try {
      const data = await apiFetch<any>(`/api/campaigns/${id}/score-leads`, { method: "POST", retries: 1 });
      setScoreSummary(data.summary);
      toast.success(`Scored ${data.scores.length} leads`);
      load({ silent: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setScoring(false);
    }
  }

  // Debounced recipient search — prevents a request per keystroke and
  // avoids stale results overwriting newer ones.
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchReqIdRef = React.useRef(0);
  function searchRecipients(q: string) {
    setSearch(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const reqId = ++searchReqIdRef.current;
      try {
        const data = await apiFetch<any>(`/api/campaigns/${id}/recipients?q=${encodeURIComponent(q)}`);
        // Only apply if this is still the latest request
        if (reqId === searchReqIdRef.current) {
          setRecipients(data.recipients);
          setRecipientTotal(data.total);
        }
      } catch {
        // ignore search errors
      }
    }, 250);
  }

  async function loadAnalytics() {
    try {
      const data = await apiFetch<any>(`/api/campaigns/${id}/analytics`, { retries: 2 });
      setAnalytics(data);
    } catch {
      // non-fatal
    }
  }

  async function simulateSend() {
    setSending(true);
    try {
      await apiFetch(`/api/campaigns/${id}/simulate-send`, { method: "POST", retries: 1 });
      toast.success("Campaign sent (simulated)");
      load({ silent: true });
      loadAnalytics();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  async function selectVariant(variantId: string) {
    try {
      await apiFetch(`/api/campaigns/${id}/select-variant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      toast.success("Email selected — ready to send");
      load({ silent: true });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function sendSelected() {
    setSending(true);
    try {
      // Branch by provider:
      // - Web3Forms: must send CLIENT-SIDE (free tier blocks server-side calls with 403)
      // - SMTP: send SERVER-SIDE via the /send API route
      if (smtpStatus?.provider === "web3forms" && smtpStatus.configured) {
        await sendViaWeb3Forms();
      } else {
        await sendViaSmtp();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  /**
   * Send via Web3Forms — runs entirely in the browser because Web3Forms
   * free tier blocks server-side requests (returns 403 "Pro plan required").
   * Fetches the config (access key) + campaign data from the server, then
   * sends each personalized email directly from the browser to Web3Forms.
   */
  async function sendViaWeb3Forms() {
    // 1. Load the Web3Forms config (access key) from the server
    const cfg = await apiFetch<any>("/api/smtp-config", { retries: 2 });
    if (!cfg || cfg.provider !== "web3forms" || !cfg.web3formsKey) {
      toast.error("Web3Forms access key not configured. Go to Settings → Email Sending.");
      return;
    }

    // 2. Load the selected variant + recipients (already in state, but refresh to be safe)
    const camp = await apiFetch<any>(`/api/campaigns/${id}`, { retries: 2 });
    const selected = camp.variants?.find((v: any) => v.id === camp.selectedVariantId);
    if (!selected) {
      toast.error("Select an email draft first.");
      return;
    }
    const toSend = (camp.recipients || []).filter((r: any) => r.status !== "sent");
    if (toSend.length === 0) {
      toast.info("All recipients already sent — nothing to do.");
      return;
    }

    const { sendEmailWeb3FormsClient } = await import("@/lib/web3forms-client");
    const { personalize } = await import("@/lib/personalize");

    let sent = 0;
    let failed = 0;
    let withoutName = 0;
    const errors: string[] = [];
    const sentAt = new Date().toISOString();

    // 3. Send each personalized email client-side
    for (const r of toSend) {
      if (!r.name) withoutName++;
      const sentSubject = personalize(selected.subject, r);
      const sentBody = personalize(selected.body, r);

      const result = await sendEmailWeb3FormsClient({
        accessKey: cfg.web3formsKey,
        fromName: cfg.fromName,
        fromEmail: cfg.fromEmail,
        to: r.email,
        toName: r.name || undefined,
        subject: sentSubject,
        text: sentBody,
      });

      // 4. Record the result server-side (update recipient status)
      try {
        await apiFetch(`/api/campaigns/${id}/recipients/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: result.ok ? "sent" : "failed",
            sentSubject,
            sentBody,
            sentAt,
          }),
          retries: 1,
        });
      } catch {
        // non-fatal — the email was still sent via Web3Forms
      }

      if (result.ok) sent++;
      else {
        failed++;
        errors.push(`${r.email}: ${result.error}`);
      }

      // Small delay to respect rate limits
      await new Promise((res) => setTimeout(res, 200));
    }

    // 5. Update campaign status
    if (sent > 0) {
      try {
        await apiFetch(`/api/campaigns/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
      } catch {
        // non-fatal
      }
    }

    if (failed > 0) {
      toast.warning(`Sent ${sent}, failed ${failed} of ${toSend.length} emails via Web3Forms`);
      if (errors.length > 0) console.error("Web3Forms send errors:", errors.slice(0, 5));
    } else {
      toast.success(`Sent ${sent} real emails via Web3Forms`);
    }
    if (withoutName > 0) toast.warning(`${withoutName} recipient(s) had no name — addressed as "there"`);

    load({ silent: true });
    loadAnalytics();
  }

  /**
   * Send via SMTP — server-side via the /send API route (Nodemailer).
   */
  async function sendViaSmtp() {
    const data = await apiFetch<any>(`/api/campaigns/${id}/send`, { method: "POST", retries: 1 });
    if (data.failed > 0) {
      toast.warning(`Sent ${data.sent}, failed ${data.failed} of ${data.total} emails via SMTP`);
    } else {
      toast.success(`Sent ${data.sent} real emails via SMTP`);
    }
    if (data.warning) toast.warning(data.warning);
    load({ silent: true });
    loadAnalytics();
  }

  async function downloadCsvTemplate() {
    const sample = `email,name,company,notes
john@acme.com,John Smith,Acme Inc,Marketing manager
jane@techco.com,Jane Doe,TechCo,CTO
founder@startup.io,,Startup Inc,
`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email-list-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="skeleton-premium h-8 w-40 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-premium h-28 w-full rounded-2xl" />)}
    </div>
  );
  if (!campaign) return <EmptyState title="Campaign not found" />;

  const iconBtn = "btn-press inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="relative mx-auto max-w-6xl space-y-5">
      {refreshing && (
        <div className="elite-glass fixed right-6 top-20 z-40 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-md">
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--brand-indigo)" }} /> Refreshing…
        </div>
      )}
      <button onClick={onBack} className="btn-press inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to campaigns
      </button>

      {/* Campaign header — hero depth card */}
      <Panel lit className="overflow-hidden">
        <div className="relative p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: "var(--brand-indigo)" }} />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{campaign.name}</h2>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{campaign.productName} <span className="text-[var(--brand-indigo)]">→</span> {campaign.targetAudience}</p>
              {campaign.valueProp && <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{campaign.valueProp}&rdquo;</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className={iconBtn} onClick={downloadCsvTemplate}><FileText className="h-3.5 w-3.5" /> CSV template</button>
              {recipientTotal > 0 && (
                <button className={iconBtn} onClick={scoreLeads} disabled={scoring}>
                  {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />} {scoring ? "Scoring…" : "Score Leads"}
                </button>
              )}
              {campaign.variants?.length > 0 && recipientTotal > 0 && campaign.status !== "sent" && !campaign.selectedVariantId && (
                <button className={cn(iconBtn, "border-transparent")} style={{ background: "color-mix(in oklch, var(--brand-mint) 12%, transparent)", color: "var(--brand-mint)" }} onClick={simulateSend} disabled={sending} title="Simulate send outcomes without real SMTP (for analytics demo)">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Simulate
                </button>
              )}
              <button
                onClick={generateEmails}
                disabled={generating}
                className="btn-press inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {generating ? "Generating…" : "Generate Emails"}
              </button>
            </div>
          </div>
          {campaign.seoKeywords?.length > 0 && (
            <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted-foreground">SEO keywords:</span>
              {campaign.seoKeywords.map((k: string, i: number) => (
                <span key={i} className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "color-mix(in oklch, var(--brand-mint) 12%, transparent)", color: "var(--brand-mint)" }}>{k}</span>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Generating — animated agent progress with shimmer */}
      {generating && (
        <Panel className="overflow-hidden p-5">
          <div className="mb-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--brand-indigo)" }} />
            <span className="text-sm font-medium">EmailCopywriter agent is working…</span>
          </div>
          <div className="space-y-2.5">
            {GEN_STEPS.map((s, i) => {
              const done = i < genStep;
              const active = i === genStep;
              return (
                <div key={s} className="flex items-center gap-2.5">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: done ? "var(--brand-mint)" : active ? "var(--brand-indigo)" : "color-mix(in oklch, var(--muted-foreground) 25%, transparent)" }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  {active ? (
                    <span className="relative flex-1 overflow-hidden text-sm text-foreground">
                      {s}
                    </span>
                  ) : (
                    <span className={cn("text-sm", done ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={GEN_STEPS.length}
            aria-valuenow={genStep + 1}
            aria-label="Generation progress"
          >
            {/* Animate transform:scaleX (GPU-composited) rather than width (per-frame layout). */}
            <motion.div
              className="h-full w-full origin-left rounded-full will-change-transform"
              style={{ background: "linear-gradient(90deg, var(--brand-indigo), var(--brand-mint))" }}
              initial={{ scaleX: 0.08 }}
              animate={{ scaleX: Math.min(1, (genStep + 1) / GEN_STEPS.length) }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>
        </Panel>
      )}

      {/* Workspace bento: CSV intake + recipients */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* CSV upload */}
        <Panel className="p-5">
          <PanelTitle icon={Upload} accent="var(--brand-indigo)">Recipient List (CSV)</PanelTitle>
          <div className="mt-4 space-y-3">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a CSV of recipients — drop a file or activate to browse"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadCsv(f); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-[color-mix(in_oklch,var(--brand-indigo)_50%,transparent)] hover:bg-muted/30"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Drop CSV here or click to browse</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Must include <span className="font-semibold text-foreground">email</span> + <span className="font-semibold text-foreground">name</span> columns (name used to personalize each email)</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCsv(f); }} />
            </div>
            <div className="text-center text-xs text-muted-foreground">— or paste CSV text —</div>
            <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="email,name,company&#10;john@example.com,John,Acme" rows={4} className="rounded-xl font-mono text-xs" />
            <button onClick={() => uploadCsv()} disabled={uploading} className="btn-press flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import recipients
            </button>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> <span className="font-semibold tabular-nums text-foreground">{recipientTotal}</span> recipients</span>
            </div>
          </div>
        </Panel>

        {/* Recipient preview */}
        <Panel className="p-5">
          <PanelTitle
            icon={ListChecks}
            accent="var(--brand-indigo)"
            right={
              <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => searchRecipients(e.target.value)} placeholder="Search…" className="h-8 rounded-lg pl-7 text-xs" />
              </div>
            }
          >
            Recipients
          </PanelTitle>
          <div className="mt-4">
            {recipients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recipients yet. Upload a CSV to get started.</p>
            ) : (
              <div className="scroll-thin -mx-1 max-h-72 space-y-1 overflow-y-auto">
                {recipients.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: "color-mix(in oklch, var(--brand-indigo) 14%, transparent)", color: "var(--brand-indigo)" }}>
                      {(r.name || r.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{r.name || r.email}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{r.email}{r.company ? ` · ${r.company}` : ""}</div>
                      {r.leadFit && <div className="truncate text-[10px] italic text-muted-foreground/80">{r.leadFit}</div>}
                    </div>
                    {r.leadScore != null && <LeadScoreBadge score={r.leadScore} tier={r.leadTier} fit={r.leadFit} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Lead scoring summary */}
      {recipients.some((r) => r.leadScore != null) && (() => {
        const hot = recipients.filter((r) => r.leadTier === "hot").length;
        const warm = recipients.filter((r) => r.leadTier === "warm").length;
        const cold = recipients.filter((r) => r.leadTier === "cold").length;
        const avg = Math.round(recipients.filter((r) => r.leadScore != null).reduce((a, b) => a + (b.leadScore || 0), 0) / recipients.filter((r) => r.leadScore != null).length);
        return (
          <Panel className="p-5" glowColor="var(--destructive)">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4" style={{ color: "var(--destructive)" }} />
              <h3 className="text-sm font-semibold">Lead Scoring Summary</h3>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">avg <span className="font-semibold tabular-nums text-foreground">{avg}</span>/100</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <TierTile value={hot} label="Hot leads" color="var(--destructive)" />
              <TierTile value={warm} label="Warm leads" color="var(--brand-amber)" />
              <TierTile value={cold} label="Cold leads" color="var(--muted-foreground)" />
            </div>
          </Panel>
        );
      })()}

      {/* Email drafts — pick the best */}
      {campaign.variants?.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: "var(--brand-indigo)" }} />
            <h3 className="font-semibold tracking-tight">Draft Emails — pick the best one</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{campaign.variants.length}</span>
            {campaign.selectedVariantId && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklch, var(--brand-mint) 15%, transparent)", color: "var(--brand-mint)" }}>
                <Check className="h-3 w-3" /> 1 selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Review the drafts, then click <span className="font-medium text-foreground">&ldquo;Select this email&rdquo;</span> on your favorite. It will be personalized with each recipient&rsquo;s name and sent to your list.</p>
          <motion.div variants={staggerGrid} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-2">
            {campaign.variants.map((v: any) => {
              const isSelected = campaign.selectedVariantId === v.id;
              return (
                <motion.div key={v.id} variants={staggerItem}>
                  <Panel
                    className={cn("h-full overflow-hidden transition-all", isSelected && "ring-1")}
                    glowColor={isSelected ? "var(--brand-mint)" : undefined}
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5" style={{ background: "color-mix(in oklch, var(--brand-indigo) 6%, transparent)" }}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}>{v.variant}</span>
                        <span className="text-xs font-medium">{v.strategy}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: "var(--brand-mint)" }}><Check className="h-3 w-3" /> Selected</span>
                        )}
                        <CopyButton text={`Subject: ${v.subject}\n\n${v.body}`} />
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Subject</div>
                        <div className="text-sm font-semibold">{v.subject}</div>
                        {v.preheader && <div className="mt-0.5 text-xs text-muted-foreground">{v.preheader}</div>}
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Body</div>
                        {/* Prompt block — clean typography, rounded, hairline, mono-ish */}
                        <pre className="scroll-thin max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3.5 text-[13px] font-sans leading-relaxed">{v.body}</pre>
                      </div>
                      {v.cta && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">CTA:</span>
                          <span className="rounded-md border border-border px-2 py-0.5 text-xs">{v.cta}</span>
                        </div>
                      )}
                      <button
                        onClick={() => selectVariant(v.id)}
                        disabled={isSelected}
                        className="btn-press flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-transform"
                        style={{ background: isSelected ? "var(--brand-mint)" : "linear-gradient(135deg, var(--brand-indigo), var(--brand-violet))" }}
                      >
                        {isSelected ? <><Check className="h-4 w-4" /> This is your selected email</> : <><Check className="h-4 w-4" /> Select this email</>}
                      </button>
                    </div>
                  </Panel>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Product picture preview */}
      {campaign.productImage && (
        <Panel className="p-5">
          <PanelTitle icon={ImageIcon} accent="var(--brand-violet)">Product Picture</PanelTitle>
          <div className="mt-4 flex items-start gap-4">
            <img src={campaign.productImage} alt="Product" className="h-24 w-24 rounded-xl border border-border object-cover" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI vision analysis</div>
              {campaign.productImageDesc ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{campaign.productImageDesc}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">Will be analyzed when you generate emails.</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* Send selected — the main action */}
      {campaign.selectedVariantId && campaign.variants?.length > 0 && recipientTotal > 0 && campaign.status !== "sent" && (() => {
        const selected = campaign.variants.find((v: any) => v.id === campaign.selectedVariantId);
        const withoutName = recipients.filter((r) => !r.name).length;
        const smtpConfigured = !!smtpStatus?.configured;
        return (
          <Panel className="p-5" glowColor="var(--brand-mint)">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--brand-mint), var(--brand-cyan))" }}>
                <Send className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Ready to send your selected email</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sending to <span className="font-semibold text-foreground">{recipientTotal} recipients</span>. Each email will be personalized with the recipient&rsquo;s name and sent as a <span className="font-semibold text-foreground">real email</span> via SMTP.
                </p>
                {selected && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Subject:</span> <span className="text-foreground">{selected.subject}</span>
                  </div>
                )}
                {smtpConfigured ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px]" style={{ background: "color-mix(in oklch, var(--brand-mint) 12%, transparent)", color: "var(--brand-mint)" }}>
                    ✓ {smtpStatus?.provider === "web3forms" ? "Web3Forms" : "SMTP"} configured — sending from {smtpStatus?.fromEmail}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md px-2.5 py-1.5 text-[11px]" style={{ background: "color-mix(in oklch, var(--brand-amber) 12%, transparent)", color: "var(--brand-amber)" }}>
                    ⚠️ Email sending not configured. Go to <span className="font-semibold">Settings → Email Sending</span> and add a Web3Forms access key (easiest, free 250/month) or SMTP credentials — without it, emails will only be stored, not delivered.
                  </div>
                )}
                {withoutName > 0 && (
                  <div className="mt-2 rounded-md px-2.5 py-1.5 text-[11px]" style={{ background: "color-mix(in oklch, var(--brand-amber) 12%, transparent)", color: "var(--brand-amber)" }}>
                    ⚠️ {withoutName} recipient(s) have no name in the CSV — they&rsquo;ll be addressed as &ldquo;there&rdquo;. For best results, ensure your CSV has a &ldquo;name&rdquo; column.
                  </div>
                )}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button disabled={sending} className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, var(--brand-mint), var(--brand-cyan))" }}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Sending real emails…" : `Send ${recipientTotal} personalized emails${smtpStatus?.provider === "web3forms" ? " via Web3Forms" : smtpConfigured ? " via SMTP" : ""}`}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send {recipientTotal} real emails?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a <span className="font-semibold text-foreground">real email</span> to each of the {recipientTotal} recipients via SMTP{smtpConfigured ? <> from <span className="font-mono">{smtpStatus?.fromEmail}</span></> : null}. Each email is personalized with the recipient&rsquo;s name. This action cannot be undone.
                    {!smtpConfigured && <><br /><br /><span className="font-medium text-amber-600">⚠️ SMTP is not configured — emails will be stored but not delivered. Configure SMTP in Settings first.</span></>}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={sendSelected} style={{ background: "var(--brand-mint)", color: "white" }}>
                    <Send className="h-4 w-4 mr-2" /> Yes, send emails
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {sending && <p className="mt-2 text-center text-[11px] text-muted-foreground">Sending one-by-one with a small delay to respect rate limits…</p>}
          </Panel>
        );
      })()}

      {/* Sent emails preview */}
      {campaign.status === "sent" && recipients.some((r) => r.sentBody) && (
        <Panel className="p-5">
          <PanelTitle
            icon={MailCheck}
            accent="var(--brand-mint)"
            right={<span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklch, var(--brand-mint) 15%, transparent)", color: "var(--brand-mint)" }}>{recipients.filter((r) => r.sentBody).length} sent</span>}
          >
            Sent Emails (personalized)
          </PanelTitle>
          <p className="mb-3 mt-3 text-xs text-muted-foreground">Each email was personalized with the recipient&rsquo;s name. Preview the first few below:</p>
          <div className="scroll-thin max-h-96 space-y-2 overflow-y-auto">
            {recipients.filter((r) => r.sentBody).slice(0, 12).map((r) => (
              <details key={r.id} className="group rounded-xl border border-border">
                <summary className="flex list-none cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "color-mix(in oklch, var(--brand-mint) 14%, transparent)", color: "var(--brand-mint)" }}>
                    {(r.name || r.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{r.name || r.email}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.sentSubject}</div>
                  </div>
                  <MailCheck className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" style={{ color: "var(--brand-mint)" }} />
                </summary>
                <div className="border-t border-border bg-muted/20 px-3 pb-3 pt-1">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">To: {r.name || "(no name)"} &lt;{r.email}&gt;</div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Subject: {r.sentSubject}</div>
                  <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed">{r.sentBody}</pre>
                </div>
              </details>
            ))}
          </div>
        </Panel>
      )}

      {/* Analytics */}
      {analytics && analytics.total > 0 && (
        <Panel className="p-5">
          <PanelTitle
            icon={BarChart3}
            accent="var(--brand-mint)"
            right={campaign.status === "sent" ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklch, var(--brand-mint) 15%, transparent)", color: "var(--brand-mint)" }}>Sent</span> : undefined}
          >
            Campaign Analytics
          </PanelTitle>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RateMetric icon={Send} label="Delivery" value={analytics.rates.delivery} color="var(--brand-cyan)" suffix="%" />
              <RateMetric icon={Eye} label="Open rate" value={analytics.rates.open} color="var(--brand-mint)" suffix="%" />
              <RateMetric icon={MousePointerClick} label="Click rate" value={analytics.rates.click} color="var(--brand-amber)" suffix="%" />
              <RateMetric icon={MailCheck} label="Replies" value={analytics.rates.reply} color="var(--brand-violet)" />
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Delivery funnel</div>
              <div className="flex flex-wrap items-center gap-2">
                <FunnelChip icon={Users} label="Total" value={analytics.total} color="var(--muted-foreground)" />
                <FunnelChip icon={MailCheck} label="Sent" value={analytics.byStatus.sent} color="var(--brand-cyan)" />
                <FunnelChip icon={Eye} label="Opened" value={analytics.byStatus.opened} color="var(--brand-mint)" />
                <FunnelChip icon={MousePointerClick} label="Clicked" value={analytics.byStatus.clicked} color="var(--brand-amber)" />
                <FunnelChip icon={MailX} label="Failed" value={analytics.byStatus.failed} color="var(--destructive)" />
                <FunnelChip icon={Users} label="Pending" value={analytics.byStatus.pending} color="var(--muted-foreground)" />
              </div>
            </div>

            {analytics.variants?.length > 1 && (
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">A/B variant performance</div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Variant</th>
                        <th className="px-3 py-2 text-right font-medium">Sent</th>
                        <th className="px-3 py-2 text-right font-medium">Opened</th>
                        <th className="px-3 py-2 text-right font-medium">Open %</th>
                        <th className="px-3 py-2 text-right font-medium">Click %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.variants.map((v: any) => (
                        <tr key={v.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: v.variant === "A" ? "var(--brand-indigo)" : "var(--brand-violet)" }}>{v.variant}</span>
                              <span className="max-w-[180px] truncate text-muted-foreground">{v.subject}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{v.sent}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{v.opened}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "var(--brand-mint)" }}>{v.openRate}%</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "var(--brand-amber)" }}>{v.clickRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Export action */}
      {campaign.variants?.length > 0 && recipientTotal > 0 && (
        <Panel className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4" style={{ color: "var(--brand-mint)" }} /> Ready to send</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{recipientTotal} recipients · {campaign.variants.length} email variants. Export your campaign as a CSV ready for your email tool.</p>
          </div>
          <button onClick={() => exportCampaign(campaign, recipients)} className="btn-press inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted">
            <Copy className="h-4 w-4" /> Export mail-merge CSV
          </button>
        </Panel>
      )}
    </motion.div>
  );
}

function LeadScoreBadge({ score, tier, fit }: { score: number; tier?: string; fit?: string }) {
  const color = tier === "hot" ? "var(--destructive)" : tier === "warm" ? "var(--brand-amber)" : "var(--muted-foreground)";
  return (
    <span
      className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
      style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
      title={fit || ""}
    >
      {score}
    </span>
  );
}

function TierTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center" style={{ background: `color-mix(in oklch, ${color} 7%, transparent)` }}>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: `color-mix(in oklch, ${color} 75%, var(--foreground))` }}>{label}</div>
    </div>
  );
}

function exportCampaign(campaign: any, recipients: any[]) {
  // Use the user-SELECTED variant if one is chosen; otherwise fall back to
  // the first variant. Previously this always used variants[0], ignoring the
  // user's explicit draft selection.
  const variant =
    campaign.variants.find((v: any) => v.id === campaign.selectedVariantId) ||
    campaign.variants[0];
  if (!variant) {
    toast.error("No email draft to export");
    return;
  }
  const rows = [
    ["email", "name", "company", "subject", "body"],
    ...recipients.map((r) => [
      r.email,
      r.name || "",
      r.company || "",
      (variant.subject || "").replace(/\{\{first_name\}\}/gi, () => r.name?.split(/\s+/)[0] || "there").replace(/\{\{company\}\}/gi, () => r.company || "your company"),
      (variant.body || "").replace(/\{\{first_name\}\}/gi, () => r.name?.split(/\s+/)[0] || "there").replace(/\{\{company\}\}/gi, () => r.company || "your company"),
    ]),
  ];
  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${campaign.name.replace(/\s+/g, "-").toLowerCase()}-mailmerge.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported mail-merge CSV (selected draft)");
}

function RateMetric({ icon: Icon, label, value, color, suffix }: { icon: any; label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `color-mix(in oklch, ${color} 14%, transparent)`, color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}{suffix}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function FunnelChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)`, color }}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
