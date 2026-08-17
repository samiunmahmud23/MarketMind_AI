"use client";

import * as React from "react";
import {
  PenTool,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  Megaphone,
  FileText,
  Hash,
  MousePointerClick,
  Share2,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { EmptyState, CopyButton } from "@/components/shared";
import { cn } from "@/lib/utils";

const STEPS = [
  "Composing hooks & angles",
  "Writing platform-ready variants",
  "Polishing CTAs & formatting",
];

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  ad: { label: "Ad Copy", icon: Megaphone, color: "text-rose-600 bg-rose-500/10" },
  landing: { label: "Landing Page", icon: FileText, color: "text-emerald-600 bg-emerald-500/10" },
  headline: { label: "Headlines", icon: Hash, color: "text-amber-600 bg-amber-500/10" },
  cta: { label: "CTAs", icon: MousePointerClick, color: "text-sky-600 bg-sky-500/10" },
  social: { label: "Social Posts", icon: Share2, color: "text-violet-600 bg-violet-500/10" },
  product: { label: "Product Desc", icon: Package, color: "text-teal-600 bg-teal-500/10" },
};

export function CopywritingSection({ itemId }: { itemId?: string | null }) {
  const [form, setForm] = React.useState({
    type: "ad",
    brand: "",
    product: "",
    audience: "",
    tone: "professional",
    platform: "general",
    angle: "mix",
  });
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>("/api/copywriting", { retries: 3 });
      setHistory(data);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  // Auto-open specific item when navigated from global search
  React.useEffect(() => {
    if (itemId) {
      viewHistory(itemId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  React.useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const timers: any[] = [];
    STEPS.forEach((_, i) => timers.push(setTimeout(() => setStepIdx(i), i * 3500)));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function generate() {
    if (!form.brand || !form.product || !form.audience) {
      toast.error("Brand, product, and audience are required");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await apiFetch<any>("/api/copywriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        retries: 1,
      });
      setResult(data);
      toast.success("Copy generated");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function viewHistory(id: string) {
    try {
      const data = await apiFetch<any>(`/api/copywriting/${id}`);
      setResult(data);
      setForm({ type: data.type, brand: data.brand, product: data.product, audience: data.audience, tone: data.tone, platform: data.platform || "general", angle: data.angle || "mix" });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteHistory(id: string) {
    try {
      await apiFetch(`/api/copywriting/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PenTool className="h-4 w-4 text-rose-600" /> Copy Brief</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Copy type</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(TYPE_META).map(([k, m]) => {
                  const Icon = m.icon;
                  const active = form.type === k;
                  return (
                    <button key={k} onClick={() => setForm({ ...form, type: k })} className={cn("flex flex-col items-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-all", active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                      <Icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Brand *"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Example Brand" /></Field>
            <Field label="Product / offer *"><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Marketing service subscription" /></Field>
            <Field label="Target audience *"><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="SaaS founders, marketing managers" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tone">
                <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Platform">
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="meta">Meta (FB/IG)</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="x">X / Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Angle">
              <Select value={form.angle} onValueChange={(v) => setForm({ ...form, angle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mix">Mix (recommended)</SelectItem>
                  <SelectItem value="pain">Pain-driven</SelectItem>
                  <SelectItem value="outcome">Outcome-driven</SelectItem>
                  <SelectItem value="authority">Authority-driven</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={generate} disabled={busy} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Generate Copy
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <div className="lg:col-span-3 space-y-4">
          {busy && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3"><Loader2 className="h-4 w-4 animate-spin text-rose-500" /><span className="text-sm font-medium">Copywriting is in progress…</span></div>
                <div className="space-y-2.5">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground")}>
                        {i < stepIdx ? "✓" : i + 1}
                      </div>
                      <span className={cn("text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result && !busy && (
            <div className="space-y-3">
              {result.notes && (
                <Card className="bg-muted/40">
                  <CardContent className="p-3 text-xs text-muted-foreground italic">{result.notes}</CardContent>
                </Card>
              )}
              {result.variants?.map((v: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{v.label}</Badge>
                      <CopyButton text={v.content} />
                    </div>
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{v.content}</pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!result && !busy && (
            <EmptyState
              icon={<PenTool className="h-10 w-10" />}
              title="Generate marketing copy"
              description="Pick a copy type, fill the brief, and the Copywriter agent produces platform-ready ad copy, landing pages, headlines, CTAs, social posts, and product descriptions."
            />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Copy History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : history.map((h) => {
                  const m = TYPE_META[h.type] || TYPE_META.ad;
                  const Icon = m.icon;
                  return (
                    <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", m.color)}><Icon className="h-4 w-4" /></div>
                      <button onClick={() => viewHistory(h.id)} className="min-w-0 flex-1 text-left">
                        <div className="text-sm font-medium truncate">{h.brand} · {h.product}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.label} · {h.platform || "general"} · {h.tone}</div>
                      </button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewHistory(h.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteHistory(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                })}
          </CardContent>
        </Card>
      )}
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
