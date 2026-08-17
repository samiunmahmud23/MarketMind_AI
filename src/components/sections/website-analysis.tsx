"use client";

import * as React from "react";
import {
  Globe,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ScoreRing, ScoreBar, EmptyState, CopyButton } from "@/components/shared";
import { Markdown } from "@/components/markdown";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

const STEPS = [
  "Fetching page content via web-reader",
  "Extracting brand & content signals",
  "Researching competitor landscape",
  "Running WebsiteAnalyst scoring (SWOT)",
  "Composing full analysis report",
];

export function WebsiteAnalysisSection({ itemId }: { itemId?: string | null }) {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>("/api/analyze-website", { retries: 3 });
      setHistory(data);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStepIdx(i), i * 3500));
    });
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function analyze(targetUrl?: string) {
    const u = (targetUrl || url).trim();
    if (!u) {
      toast.error("Enter a website URL");
      return;
    }
    try {
      new URL(u.startsWith('http') ? u : `https://${u}`);
    } catch {
      toast.error("Please enter a valid URL (e.g., https://example.com)");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await apiFetch<any>("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
        retries: 1,
      });
      setResult(data);
      toast.success("Analysis complete");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewHistory(id: string) {
    try {
      const data = await apiFetch<any>(`/api/analyses/${id}`);
      setResult(data);
      setUrl(data.url);
      toast.success("Loaded analysis");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteHistory(id: string) {
    try {
      await apiFetch(`/api/analyses/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  const scores = result?.scores;
  const meta = result?.meta;
  const recommendations = result?.recommendations || meta?.recommendations || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="url" className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Website, Facebook or Instagram URL
              </Label>
              <Input
                id="url"
                placeholder="https://yourbrand.com  ·  facebook.com/yourpage  ·  instagram.com/yourhandle"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                className="h-11"
              />
            </div>
            <Button
              onClick={() => analyze()}
              disabled={busy}
              className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {busy ? "Analyzing…" : "Analyze Website"}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["stripe.com", "notion.so", "linear.app"].map((s) => (
              <button
                key={s}
                onClick={() => setUrl(s)}
                className="text-[11px] rounded-full border border-border px-2.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Try: {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {busy && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Website analysis is running…</span>
            </div>
            <div className="space-y-2.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  <span className={cn("text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                  {i === stepIdx && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !busy && (
        <div className="space-y-6">
          {/* Header card with scores */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex flex-col items-center justify-center gap-2 lg:border-r lg:border-border lg:pr-6">
                  <ScoreRing value={scores?.overall ?? 0} size={140} label="Overall" />
                  <Badge variant="outline" className="text-xs">{result.industry || "Industry"}</Badge>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div className="sm:col-span-2">
                    <h3 className="text-lg font-semibold">{result.title || result.url}</h3>
                    <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">{result.url}</a>
                    <p className="mt-1.5 text-sm text-muted-foreground">{result.summary}</p>
                  </div>
                  <ScoreBar label="Clarity" value={scores?.clarity ?? 0} />
                  <ScoreBar label="Value Proposition" value={scores?.valueProposition ?? 0} />
                  <ScoreBar label="Design" value={scores?.design ?? 0} />
                  <ScoreBar label="Content" value={scores?.content ?? 0} />
                  <ScoreBar label="Conversion" value={scores?.conversion ?? 0} />
                  <ScoreBar label="Trust" value={scores?.trust ?? 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SWOT + audience */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SwotCard icon={TrendingUp} title="Strengths" items={meta?.strengths} color="emerald" />
            <SwotCard icon={Zap} title="Weaknesses" items={meta?.weaknesses} color="rose" />
            <SwotCard icon={Target} title="Opportunities" items={meta?.opportunities} color="amber" />
            <SwotCard icon={Globe} title="Competitors" items={meta?.competitors} color="sky" />
          </div>

          {result.targetAudience && (
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Audience</div>
                  <p className="text-sm mt-0.5">{result.targetAudience}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {recommendations.map((r: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">{i + 1}</span>
                      <div>
                        <div className="text-sm font-medium">{r.title}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Full report */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Full Analysis Report</CardTitle>
              <CopyButton text={result.report} />
            </CardHeader>
            <CardContent>
              <Markdown content={result.report} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!result && !busy && history.length === 0 && !loadingHistory && (
        <EmptyState
          icon={<Globe className="h-10 w-10" />}
          title="No analyses yet"
          description="Paste a website, Facebook, or Instagram URL above and let the WebsiteAnalyst agent produce a full strategic audit."
        />
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Analysis History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <button onClick={() => viewHistory(h.id)} className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-medium truncate">{h.title || h.url}</div>
                      <div className="text-xs text-muted-foreground truncate">{h.url}</div>
                    </button>
                    {h.scores?.overall != null && (
                      <Badge variant="secondary" className="tabular-nums">{Math.round(h.scores.overall)}</Badge>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewHistory(h.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteHistory(h.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SwotCard({ icon: Icon, title, items, color }: { icon: any; title: string; items?: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    sky: "text-sky-600 bg-sky-500/10",
  };
  return (
    <Card className="transition-all hover:-translate-y-1 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wide">
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${colorMap[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items?.length ? (
          <ul className="space-y-1.5 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-current shrink-0" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No data</p>
        )}
      </CardContent>
    </Card>
  );
}
