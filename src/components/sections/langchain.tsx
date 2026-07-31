"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Network,
  Database,
  Search,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
  CheckCircle2,
  GitBranch,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GlassCard, EmptyState, CopyButton } from "@/components/shared";
import { Markdown } from "@/components/markdown";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type Tab = "graph" | "rag";

export function LangChainSection() {
  const [tab, setTab] = React.useState<Tab>("graph");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <GlassCard strong className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
            <Network className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight">LangGraph + LangChain + RAG</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-agent orchestration with parallel execution, conditional routing, and retrieval-augmented generation.
            </p>
          </div>
          <div className="flex gap-1.5">
            <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">LangChain</Badge>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">LangGraph</Badge>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">RAG</Badge>
          </div>
        </div>
      </GlassCard>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("graph")}
          className={cn("btn-press flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all", tab === "graph" ? "border-violet-500 bg-violet-500/5 text-violet-600 dark:text-violet-400" : "border-border text-muted-foreground hover:bg-muted")}
        >
          <GitBranch className="h-4 w-4" /> LangGraph Workflow
        </button>
        <button
          onClick={() => setTab("rag")}
          className={cn("btn-press flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all", tab === "rag" ? "border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400" : "border-border text-muted-foreground hover:bg-muted")}
        >
          <Database className="h-4 w-4" /> RAG Knowledge Base
        </button>
      </div>

      {tab === "graph" ? <GraphTab /> : <RagTab />}
    </div>
  );
}

/* ============ LangGraph Workflow Tab ============ */

const GRAPH_STEPS = [
  "Fetching page content (page_reader)",
  "Retrieving RAG context (vector search)",
  "Running parallel: Website Analysis + SEO + CRO",
  "Conditional routing (score check)",
  "Consolidating RAG-grounded report",
];

function GraphTab() {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const timers: any[] = [];
    GRAPH_STEPS.forEach((_, i) => timers.push(setTimeout(() => setStepIdx(i), i * 8000)));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function run() {
    if (!url.trim()) { toast.error("Enter a URL"); return; }
    setBusy(true);
    setResult(null);
    try {
      const data = await apiFetch<any>("/api/langgraph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        retries: 1,
      });
      setResult(data);
      toast.success("LangGraph workflow complete");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <GlassCard strong className="p-5">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-violet-500" /> URL to analyze via LangGraph</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="https://yourbrand.com" className="h-11" />
          </div>
          <Button onClick={run} disabled={busy} className="btn-press h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {busy ? "Running graph…" : "Run LangGraph Workflow"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Executes: fetch → RAG retrieval → <span className="font-medium text-foreground">parallel</span> (analysis + SEO + CRO) → conditional deep-dive → RAG-grounded consolidation.
        </p>
      </GlassCard>

      {/* Workflow visualization */}
      {busy && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4"><Loader2 className="h-4 w-4 animate-spin text-violet-500" /><span className="text-sm font-medium">LangGraph executing…</span></div>
          <div className="space-y-2.5">
            {GRAPH_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-violet-500 text-white animate-pulse" : "bg-muted text-muted-foreground")}>
                  {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                {i === 2 && <Badge variant="outline" className="text-[10px] ml-2"><Layers className="h-3 w-3 mr-1" />parallel</Badge>}
                {i === 3 && <Badge variant="outline" className="text-[10px] ml-2"><GitBranch className="h-3 w-3 mr-1" />conditional</Badge>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Result */}
      {result && !busy && (
        <div className="space-y-4">
          {/* Graph summary */}
          <GlassCard strong className="p-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <GraphMetric label="Analysis Score" value={result.analysis?.scores?.overall ?? result.analysis?.overallScore ?? "—"} color="text-emerald-600 dark:text-emerald-400" />
              <GraphMetric label="SEO Score" value={result.seo?.overallScore ?? "—"} color="text-sky-600 dark:text-sky-400" />
              <GraphMetric label="CRO Score" value={result.cro?.overallScore ?? "—"} color="text-rose-600 dark:text-rose-400" />
            </div>
            {result.needsDeepDive && (
              <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Score was below 50 — deep-dive analysis was triggered automatically.
              </div>
            )}
            {result.ragContext && result.ragContext !== "No relevant past work found in the knowledge base." && (
              <div className="mt-3 rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-xs text-violet-700 dark:text-violet-300">
                <Database className="h-3 w-3 inline mr-1" /> RAG retrieved relevant past work from the knowledge base.
              </div>
            )}
          </GlassCard>

          {/* Final report */}
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
              <span className="text-sm font-semibold">RAG-Grounded Final Report</span>
              <CopyButton text={result.finalReport || ""} />
            </div>
            <div className="p-4"><Markdown content={result.finalReport || "No report generated."} /></div>
          </GlassCard>

          {result.deepDive && (
            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <span className="text-sm font-semibold">Deep-Dive Recovery Plan</span>
                <CopyButton text={result.deepDive} />
              </div>
              <div className="p-4"><Markdown content={result.deepDive} /></div>
            </GlassCard>
          )}

          {/* Errors */}
          {result.errors?.length > 0 && (
            <GlassCard className="p-4">
              <h4 className="text-sm font-semibold text-rose-600 mb-2">Errors</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">{result.errors.map((e: string, i: number) => <li key={i}>• {e}</li>)}</ul>
            </GlassCard>
          )}
        </div>
      )}

      {!result && !busy && (
        <EmptyState
          icon={<GitBranch className="h-8 w-8" />}
          title="LangGraph Marketing Workflow"
          description="Enter a URL above. The graph will fetch the page, retrieve relevant past work from the RAG knowledge base, run 3 agents in parallel (analysis + SEO + CRO), conditionally trigger a deep-dive for low-scoring sites, and consolidate everything into a RAG-grounded report."
        />
      )}
    </div>
  );
}

function GraphMetric({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="text-center">
      <div className={cn("text-3xl font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ============ RAG Knowledge Base Tab ============ */

function RagTab() {
  const [docCount, setDocCount] = React.useState<number | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [seedResult, setSeedResult] = React.useState<any | null>(null);
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[] | null>(null);

  const loadStats = React.useCallback(async () => {
    try {
      const data = await apiFetch<any>("/api/rag/seed", { retries: 2 });
      setDocCount(data.documents || 0);
    } catch {
      // non-fatal
    }
  }, []);

  React.useEffect(() => { loadStats(); }, [loadStats]);

  async function seed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const data = await apiFetch<any>("/api/rag/seed", { method: "POST", retries: 1 });
      setSeedResult(data);
      setDocCount(data.seeded || 0);
      toast.success(`RAG knowledge base seeded with ${data.seeded} documents`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await apiFetch<any>(`/api/rag/seed?q=${encodeURIComponent(query)}`, { retries: 1 });
      setSearchResults(data.results || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats + seed */}
      <GlassCard strong className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Knowledge Base</div>
              <div className="text-xs text-muted-foreground">{docCount ?? "…"} documents embedded</div>
            </div>
          </div>
          <Button onClick={seed} disabled={seeding} className="btn-press bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {seeding ? "Seeding…" : "Seed from DB"}
          </Button>
        </div>

        {seedResult && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Seeded {seedResult.seeded} documents</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-muted-foreground">
              {Object.entries(seedResult.types || {}).map(([k, v]: [string, any]) => (
                <div key={k} className="text-center rounded-lg bg-muted/30 py-1.5">
                  <div className="font-bold tabular-nums">{v}</div>
                  <div className="text-[9px] uppercase tracking-wide">{k}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-3">
          Seeding embeds all existing analyses, SEO reports, campaigns, content, copy assets, repurpose projects, competitors, CRO reports, and AI-SEO reports into the vector store. Future LLM calls can then retrieve this context (RAG).
        </p>
      </GlassCard>

      {/* Search */}
      <GlassCard strong className="p-5">
        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-amber-500" /> Search the knowledge base</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="e.g. email marketing, SEO audit, competitor analysis…" className="h-11" />
          </div>
          <Button onClick={search} disabled={searching || !query.trim()} variant="outline" className="btn-press h-11">
            {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />} Search
          </Button>
        </div>

        {searchResults !== null && (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No results. Try seeding the knowledge base first.</p>
            ) : (
              searchResults.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{r.metadata.type}</Badge>
                    {r.metadata.url && <span className="text-[11px] text-muted-foreground truncate">{r.metadata.url}</span>}
                    {r.metadata.date && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.metadata.date).toLocaleDateString()}</span>}
                    <Badge variant="secondary" className="text-[10px] tabular-nums">{(r.score * 100).toFixed(0)}% match</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{r.content}</p>
                </motion.div>
              ))
            )}
          </div>
        )}
      </GlassCard>

      {/* How RAG works */}
      <GlassCard className="p-5">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" /> How RAG works in this project</h4>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-border/50 p-3">
            <div className="font-semibold mb-1">1. Embed</div>
            <p className="text-muted-foreground leading-relaxed">All generated content is chunked and embedded using ZaiEmbeddings (TF-IDF + hashing trick, 256-dim vectors). No external API needed.</p>
          </div>
          <div className="rounded-xl border border-border/50 p-3">
            <div className="font-semibold mb-1">2. Store</div>
            <p className="text-muted-foreground leading-relaxed">Documents stored in MemoryVectorStore (pure JS, in-memory). Each doc keeps metadata (type, URL, date) for context-aware retrieval.</p>
          </div>
          <div className="rounded-xl border border-border/50 p-3">
            <div className="font-semibold mb-1">3. Retrieve</div>
            <p className="text-muted-foreground leading-relaxed">When generating new content, the LangGraph workflow retrieves the top-3 most similar past documents and includes them as context for the LLM.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
