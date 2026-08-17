"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Users,
  Gauge,
  Code2,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ScoreRing, ScoreBar, EmptyState, CopyButton, GlassCard } from "@/components/shared";
import { Markdown } from "@/components/markdown";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type Tool = "ai-seo" | "competitor" | "cro" | "schema";

const TOOLS: { id: Tool; label: string; icon: any; color: string; desc: string; placeholder: string }[] = [
  { id: "ai-seo", label: "GEO/AEO SEO", icon: Brain, color: "text-violet-600 dark:text-violet-400 bg-violet-500/10", desc: "Prepare for citation and structured visibility", placeholder: "https://yourbrand.com" },
  { id: "competitor", label: "Competitor Profiling", icon: Users, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10", desc: "Research any competitor from their URL", placeholder: "https://competitor.com" },
  { id: "cro", label: "CRO Audit", icon: Gauge, color: "text-rose-600 dark:text-rose-400 bg-rose-500/10", desc: "Conversion rate optimization audit", placeholder: "https://yourbrand.com/pricing" },
  { id: "schema", label: "Schema Markup", icon: Code2, color: "text-sky-600 dark:text-sky-400 bg-sky-500/10", desc: "Generate JSON-LD structured data", placeholder: "https://yourbrand.com" },
];

const STEPS = ["Fetching page content", "Running specialized analysis", "Generating recommendations"];

export function MarketingSkillsSection() {
  const [tool, setTool] = React.useState<Tool>("ai-seo");
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<Record<Tool, any[]>>({ "ai-seo": [], competitor: [], cro: [], schema: [] });
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [aiSeo, comp, cro, schema] = await Promise.all([
        apiFetch<any[]>("/api/ai-seo-report", { retries: 2 }).catch(() => []),
        apiFetch<any[]>("/api/competitor-profiles", { retries: 2 }).catch(() => []),
        apiFetch<any[]>("/api/cro-report", { retries: 2 }).catch(() => []),
        apiFetch<any[]>("/api/schema-report", { retries: 2 }).catch(() => []),
      ]);
      setHistory({ "ai-seo": aiSeo, competitor: comp, cro, schema });
    } finally { setLoadingHistory(false); }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  React.useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const timers: any[] = [];
    STEPS.forEach((_, i) => timers.push(setTimeout(() => setStepIdx(i), i * 4000)));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function run(targetUrl?: string) {
    const u = (targetUrl || url).trim();
    if (!u) { toast.error("Enter a URL"); return; }
    try {
      new URL(u.startsWith('http') ? u : `https://${u}`);
    } catch {
      toast.error("Please enter a valid URL (e.g., https://example.com)");
      return;
    }
    setBusy(true); setResult(null);
    try {
      const endpoints: Record<Tool, string> = {
        "ai-seo": "/api/ai-seo-report",
        competitor: "/api/competitor-profiles",
        cro: "/api/cro-report",
        schema: "/api/schema-report",
      };
      const data = await apiFetch<any>(endpoints[tool], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }), retries: 1 });
      setResult(data);
      toast.success("Analysis complete");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally { setBusy(false); }
  }

  async function viewHistory(item: any) {
    try {
      const endpoints: Record<Tool, string> = {
        "ai-seo": `/api/ai-seo-reports/${item.id}`,
        competitor: `/api/competitor-profiles/${item.id}`,
        cro: `/api/cro-reports/${item.id}`,
        schema: `/api/schema-reports/${item.id}`,
      };
      const data = await apiFetch<any>(endpoints[tool]);
      setResult(data); setUrl(data.url);
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteHistory(id: string) {
    const endpoints: Record<Tool, string> = {
      "ai-seo": `/api/ai-seo-reports/${id}`,
      competitor: `/api/competitor-profiles/${id}`,
      cro: `/api/cro-reports/${id}`,
      schema: `/api/schema-reports/${id}`,
    };
    try {
      await apiFetch(endpoints[tool], { method: "DELETE", json: false });
      setHistory((h) => ({ ...h, [tool]: h[tool].filter((x) => x.id !== id) }));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  }

  const currentTool = TOOLS.find((t) => t.id === tool)!;
  const currentHistory = history[tool];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tool selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tool;
          return (
            <button key={t.id} onClick={() => { setTool(t.id); setResult(null); setUrl(""); }}
              className={cn("glass card-hover rounded-2xl p-4 text-left transition-all", active && "ring-2 ring-primary")}>
              <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", t.color)}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-2.5 text-sm font-semibold tracking-tight">{t.label}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <GlassCard strong className="p-5">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <currentTool.icon className={cn("h-3.5 w-3.5", currentTool.color)} /> URL to analyze
            </Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder={currentTool.placeholder} className="h-11" />
          </div>
          <Button onClick={() => run()} disabled={busy} className="btn-press h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {busy ? "Analyzing…" : "Run Analysis"}
          </Button>
        </div>
      </GlassCard>

      {/* Loading */}
      {busy && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-sm font-medium">{currentTool.label} workflow is running…</span></div>
          <div className="space-y-2.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5">
                <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className={cn("text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Result */}
      {result && !busy && <ResultView tool={tool} result={result} />}

      {/* Empty state */}
      {!result && !busy && currentHistory.length === 0 && !loadingHistory && (
        <EmptyState icon={<currentTool.icon className="h-8 w-8" />} title={`No ${currentTool.label} reports yet`} description={currentTool.desc + ". Enter a URL above to get started."} />
      )}

      {/* History */}
      {currentHistory.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3">History</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {loadingHistory ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />) :
              currentHistory.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", currentTool.color)}><currentTool.icon className="h-4 w-4" /></div>
                  <button onClick={() => viewHistory(h)} className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-medium truncate">{h.name || h.domain || h.url}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.url}</div>
                  </button>
                  {h.overallScore != null && <Badge variant="secondary" className="tabular-nums">{h.overallScore}/100</Badge>}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewHistory(h)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteHistory(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function ResultView({ tool, result }: { tool: Tool; result: any }) {
  if (tool === "ai-seo") return <AiSeoResult result={result} />;
  if (tool === "competitor") return <CompetitorResult result={result} />;
  if (tool === "cro") return <CroResult result={result} />;
  return <SchemaResult result={result} />;
}

function AiSeoResult({ result }: { result: any }) {
  return (
    <div className="space-y-5">
      <GlassCard strong className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center justify-center gap-2 lg:border-r lg:border-border/50 lg:pr-6">
            <ScoreRing value={result.overallScore} size={140} label="SEO Audit" />
            <Badge variant="outline" className="text-xs">{result.domain}</Badge>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <ScoreBar label="Visibility" value={result.scoreBreakdown?.aiVisibility ?? 0} />
            <ScoreBar label="Content Extractability" value={result.scoreBreakdown?.contentExtractability ?? 0} />
            <ScoreBar label="Structured Data" value={result.scoreBreakdown?.structuredData ?? 0} />
            <ScoreBar label="Citation Readiness" value={result.scoreBreakdown?.citationReadiness ?? 0} />
          </div>
        </div>
      </GlassCard>

      {result.llmsTxt && (
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <span className="text-sm font-semibold">Site guidance file — suggested</span>
            <CopyButton text={result.llmsTxt} />
          </div>
          <pre className="whitespace-pre-wrap text-xs font-mono p-4 max-h-64 overflow-y-auto scroll-thin">{result.llmsTxt}</pre>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
          <span className="text-sm font-semibold">Full SEO Report</span>
          <CopyButton text={result.report} />
        </div>
        <div className="p-4"><Markdown content={result.report} /></div>
      </GlassCard>
    </div>
  );
}

function CompetitorResult({ result }: { result: any }) {
  const p = result.profile || {};
  return (
    <div className="space-y-5">
      <GlassCard strong className="p-5">
        <h3 className="text-xl font-bold tracking-tight">{result.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          {p.pricing && <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Pricing</div><div>{p.pricing}</div></div>}
          {p.positioning && <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Positioning</div><div>{p.positioning}</div></div>}
          {p.targetAudience && <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Target Audience</div><div>{p.targetAudience}</div></div>}
          {p.techStack?.length > 0 && <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Tech Stack</div><div className="flex flex-wrap gap-1">{p.techStack.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>)}</div></div>}
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-4">
        {p.strengths?.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Strengths</h4>
            <ul className="space-y-1.5 text-sm">{p.strengths.map((s: string, i: number) => <li key={i} className="flex gap-2 text-muted-foreground"><span className="text-emerald-500">+</span>{s}</li>)}</ul>
          </GlassCard>
        )}
        {p.weaknesses?.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">Weaknesses</h4>
            <ul className="space-y-1.5 text-sm">{p.weaknesses.map((s: string, i: number) => <li key={i} className="flex gap-2 text-muted-foreground"><span className="text-rose-500">−</span>{s}</li>)}</ul>
          </GlassCard>
        )}
      </div>

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50"><span className="text-sm font-semibold">Full Profile Report</span><CopyButton text={result.report} /></div>
        <div className="p-4"><Markdown content={result.report} /></div>
      </GlassCard>
    </div>
  );
}

function CroResult({ result }: { result: any }) {
  return (
    <div className="space-y-5">
      <GlassCard strong className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center justify-center gap-2 lg:border-r lg:border-border/50 lg:pr-6">
            <ScoreRing value={result.overallScore} size={140} label="CRO Score" />
            <Badge variant="outline" className="text-xs capitalize">{result.pageType}</Badge>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <ScoreBar label="Value Proposition" value={result.scoreBreakdown?.valueProp ?? 0} />
            <ScoreBar label="Clarity" value={result.scoreBreakdown?.clarity ?? 0} />
            <ScoreBar label="CTAs" value={result.scoreBreakdown?.ctas ?? 0} />
            <ScoreBar label="Trust Signals" value={result.scoreBreakdown?.trust ?? 0} />
            <ScoreBar label="Friction" value={result.scoreBreakdown?.friction ?? 0} />
            <ScoreBar label="Mobile" value={result.scoreBreakdown?.mobile ?? 0} />
          </div>
        </div>
      </GlassCard>

      {result.issues?.length > 0 && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-semibold mb-3">Issues Found ({result.issues.length})</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto scroll-thin">
            {result.issues.map((iss: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] uppercase", iss.priority === "high" ? "text-rose-600 border-rose-500/20" : iss.priority === "medium" ? "text-amber-600 border-amber-500/20" : "text-muted-foreground")}>{iss.priority}</Badge>
                  <span className="text-sm font-medium">{iss.issue}</span>
                </div>
                <p className="text-xs text-muted-foreground">{iss.recommendation}</p>
                {iss.impact && <p className="text-[11px] text-primary mt-1">Impact: {iss.impact}</p>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50"><span className="text-sm font-semibold">Full CRO Report</span><CopyButton text={result.report} /></div>
        <div className="p-4"><Markdown content={result.report} /></div>
      </GlassCard>
    </div>
  );
}

function SchemaResult({ result }: { result: any }) {
  return (
    <div className="space-y-5">
      {result.jsonLd && (
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <span className="text-sm font-semibold">Generated JSON-LD (paste in &lt;head&gt;)</span>
            <CopyButton text={result.jsonLd} />
          </div>
          <pre className="whitespace-pre-wrap text-xs font-mono p-4 max-h-96 overflow-y-auto scroll-thin bg-muted/20">{result.jsonLd}</pre>
        </GlassCard>
      )}

      {result.existingAudit?.length > 0 && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-semibold mb-3">Existing Schema Audit</h4>
          <div className="space-y-2">
            {result.existingAudit.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5">
                <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                <span className={cn("text-[10px] font-semibold uppercase", a.status === "ok" ? "text-emerald-600" : a.status === "warning" ? "text-amber-600" : "text-rose-600")}>{a.status}</span>
                <span className="text-xs text-muted-foreground">{a.detail}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50"><span className="text-sm font-semibold">Schema Report</span><CopyButton text={result.report} /></div>
        <div className="p-4"><Markdown content={result.report} /></div>
      </GlassCard>
    </div>
  );
}
