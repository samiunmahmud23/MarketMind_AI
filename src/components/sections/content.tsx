"use client";

import * as React from "react";
import {
  FileText,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  Newspaper,
  Layers,
  CalendarDays,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { EmptyState, CopyButton } from "@/components/shared";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

const STEPS = [
  "Researching SEO keywords & gaps",
  "Building article outline",
  "Writing full content with FAQ",
  "Optimizing meta & word count",
];

const TYPE_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  blog: { label: "Blog Article", icon: Newspaper, color: "text-violet-600 bg-violet-500/10", desc: "~1100 words" },
  pillar: { label: "Pillar Page", icon: Layers, color: "text-emerald-600 bg-emerald-500/10", desc: "~2000 words" },
  strategy: { label: "Content Strategy", icon: Lightbulb, color: "text-amber-600 bg-amber-500/10", desc: "Full strategy doc" },
  calendar: { label: "Content Calendar", icon: CalendarDays, color: "text-sky-600 bg-sky-500/10", desc: "4-week plan" },
};

export function ContentSection({ itemId }: { itemId?: string | null }) {
  const [form, setForm] = React.useState({
    type: "blog",
    topic: "",
    brand: "",
    audience: "",
    keywords: "",
  });
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>("/api/content", { retries: 3 });
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
    STEPS.forEach((_, i) => timers.push(setTimeout(() => setStepIdx(i), i * 4000)));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function generate() {
    if (!form.topic) { toast.error("Topic is required"); return; }
    setBusy(true);
    setResult(null);
    try {
      const keywords = form.keywords.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await apiFetch<any>("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, keywords }),
        retries: 1,
      });
      setResult(data);
      toast.success("Content generated");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function viewHistory(id: string) {
    try {
      const data = await apiFetch<any>(`/api/content/${id}`);
      setResult(data);
      setForm({ type: data.type, topic: data.topic, brand: data.brand || "", audience: data.audience || "", keywords: (data.keywords || []).join(", ") });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteHistory(id: string) {
    try {
      await apiFetch(`/api/content/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-violet-600" /> Content Brief</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Content type</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TYPE_META).map(([k, m]) => {
                  const Icon = m.icon;
                  const active = form.type === k;
                  return (
                    <button key={k} onClick={() => setForm({ ...form, type: k })} className={cn("flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all", active ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <div className={cn("text-xs font-medium", active ? "text-primary" : "text-foreground")}>{m.label}</div>
                        <div className="text-[10px] text-muted-foreground">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Topic *"><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="How AI is reshaping email marketing" /></Field>
            <Field label="Brand (optional)"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Example Brand" /></Field>
            <Field label="Audience (optional)"><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Marketing managers at SaaS startups" /></Field>
            <Field label="Keywords (comma-separated, optional — agent researches if empty)"><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="ai email marketing, cold email automation" /></Field>
            <Button onClick={generate} disabled={busy} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Generate Content
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {busy && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3"><Loader2 className="h-4 w-4 animate-spin text-violet-600" /><span className="text-sm font-medium">Content strategist is writing…</span></div>
                <div className="space-y-2.5">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground")}>
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
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">{result.title || result.topic}</h3>
                      {result.metaDesc && <p className="text-xs text-muted-foreground mt-1">{result.metaDesc}</p>}
                    </div>
                    <Badge variant="secondary" className="tabular-nums shrink-0">{result.wordCount} words</Badge>
                  </div>
                  {result.keywords?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.keywords.map((k: string, i: number) => (
                        <span key={i} className="text-[10px] rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5">{k}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.outline?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Outline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.outline.map((o: any, i: number) => (
                        <div key={i}>
                          <div className="text-sm font-semibold">{o.heading}</div>
                          {o.points?.length > 0 && (
                            <ul className="mt-1 ml-4 space-y-0.5">
                              {o.points.map((p: string, j: number) => (
                                <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="mt-1 h-0.5 w-0.5 rounded-full bg-current shrink-0" />{p}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{form.type === "calendar" ? "Calendar" : form.type === "strategy" ? "Strategy Document" : "Full Article"}</CardTitle>
                  <CopyButton text={result.content} />
                </CardHeader>
                <CardContent>
                  {result.title && form.type !== "calendar" && form.type !== "strategy" && (
                    <h1 className="text-2xl font-bold mb-3">{result.title}</h1>
                  )}
                  <Markdown content={result.content} />
                </CardContent>
              </Card>
            </div>
          )}

          {!result && !busy && (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="Generate SEO content"
              description="Pick a content type, enter a topic, and the workflow researches keywords, builds an outline, and writes a full SEO-optimized article, strategy doc, or calendar."
            />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Content History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : history.map((h) => {
                  const m = TYPE_META[h.type] || TYPE_META.blog;
                  const Icon = m.icon;
                  return (
                    <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", m.color)}><Icon className="h-4 w-4" /></div>
                      <button onClick={() => viewHistory(h.id)} className="min-w-0 flex-1 text-left">
                        <div className="text-sm font-medium truncate">{h.title || h.topic}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.label} · {h.wordCount} words</div>
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
