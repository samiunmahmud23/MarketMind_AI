"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  AlertTriangle,
  KeyRound,
  ListTree,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { ScoreRing, ScoreBar, SeverityBadge, EmptyState, CopyButton } from "@/components/shared";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

const STEPS = [
  "Fetching page HTML via web-reader",
  "Running deterministic on-page audit",
  "Researching competitor keywords",
  "Scoring 4 SEO dimensions + issues",
  "Writing recommendations & 30-day action plan",
];

export function SeoSection({ itemId }: { itemId?: string | null }) {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [result, setResult] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>("/api/seo-report", { retries: 3 });
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

  async function run(targetUrl?: string) {
    const u = (targetUrl || url).trim();
    if (!u) { toast.error("Enter a website URL"); return; }
    try {
      new URL(u.startsWith('http') ? u : `https://${u}`);
    } catch {
      toast.error("Please enter a valid URL (e.g., https://example.com)");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await apiFetch<any>("/api/seo-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
        retries: 1,
      });
      setResult(data);
      toast.success("SEO report ready");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function viewHistory(id: string) {
    try {
      const data = await apiFetch<any>(`/api/seo-reports/${id}`);
      setResult(data);
      setUrl(data.url);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteHistory(id: string) {
    try {
      await apiFetch(`/api/seo-reports/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  const issues = result?.issues || [];
  const keywords = result?.keywords || [];
  const breakdown = result?.scoreBreakdown;
  const audit = result?.onPageAudit;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="seo-url" className="text-xs font-medium flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Website URL to audit</Label>
              <Input id="seo-url" placeholder="https://yourbrand.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} className="h-11" />
            </div>
            <Button onClick={() => run()} disabled={busy} className="h-11 px-6 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {busy ? "Auditing…" : "Run SEO Audit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4"><Loader2 className="h-4 w-4 animate-spin text-sky-600" /><span className="text-sm font-medium">SEO audit is running…</span></div>
            <div className="space-y-2.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground")}>
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

      {result && !busy && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex flex-col items-center justify-center gap-2 lg:border-r lg:border-border lg:pr-6">
                  <ScoreRing value={result.overallScore} size={140} label="SEO Score" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{result.domain}</h3>
                  <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">{result.url}</a>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                    <ScoreBar label="On-Page" value={breakdown?.onpage ?? 0} />
                    <ScoreBar label="Technical" value={breakdown?.technical ?? 0} />
                    <ScoreBar label="Content" value={breakdown?.content ?? 0} />
                    <ScoreBar label="Performance" value={breakdown?.performance ?? 0} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On-page audit snapshot */}
          {audit && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ListTree className="h-4 w-4 text-sky-600" /> On-Page Audit Snapshot</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {(() => {
                  const titleTag = audit.titleTag || "";
                  const metaDesc = audit.metaDescription || "";
                  const wordCount = audit.wordCount ?? 0;
                  const images = audit.images ?? 0;
                  const imgsWithoutAlt = (audit as any).imgsWithoutAlt ?? 0;
                  const links = audit.links || { internal: 0, external: 0 };
                  return (
                    <>
                      <AuditItem label="Title tag" value={titleTag || "—"} warn={!!titleTag && (titleTag.length < 30 || titleTag.length > 60)} />
                      <AuditItem label="Meta description" value={metaDesc || "—"} warn={!!metaDesc && (metaDesc.length < 70 || metaDesc.length > 160)} />
                      <AuditItem label="Word count" value={`${wordCount} words`} warn={wordCount < 300} />
                      <AuditItem label="Images" value={`${images}`} sub={`${imgsWithoutAlt} missing alt`} warn={imgsWithoutAlt > 0} />
                      <AuditItem label="Internal links" value={links.internal ?? 0} />
                      <AuditItem label="External links" value={links.external ?? 0} warn={(links.external ?? 0) === 0} />
                    </>
                  );
                })()}
                {audit.headings?.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Headings detected</div>
                    <div className="flex flex-wrap gap-1.5">
                      {audit.headings.map((h: string, i: number) => (
                        <span key={i} className="text-[11px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Issues */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Issues Found ({issues.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto scroll-thin">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 py-6 justify-center"><CheckCircle2 className="h-4 w-4" /> No major issues detected</div>
                ) : (
                  issues.map((iss: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <SeverityBadge severity={iss.severity} />
                          <span className="text-sm font-medium truncate">{iss.title}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{iss.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{iss.detail}</p>
                      {iss.fix && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs">
                          <span className="text-emerald-600 font-semibold shrink-0">Fix:</span>
                          <span className="text-muted-foreground">{iss.fix}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4 text-sky-600" /> Keyword Roadmap ({keywords.length})</CardTitle></CardHeader>
              <CardContent>
                {keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No keywords researched.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-2 pr-2 font-medium">Keyword</th>
                          <th className="py-2 px-2 font-medium">Intent</th>
                          <th className="py-2 px-2 font-medium">Vol</th>
                          <th className="py-2 px-2 font-medium">Diff</th>
                          <th className="py-2 pl-2 font-medium text-right">Opp.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywords.map((k: any, i: number) => (
                          <tr key={i} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-2 font-medium">{k.keyword}</td>
                            <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{k.intent}</Badge></td>
                            <td className="py-2 px-2 capitalize text-muted-foreground">{k.volume}</td>
                            <td className="py-2 px-2 capitalize text-muted-foreground">{k.difficulty}</td>
                            <td className="py-2 pl-2 text-right">
                              <span className={cn("inline-flex h-6 min-w-8 items-center justify-center rounded px-1.5 text-[10px] font-bold", (k.opportunity || 0) >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : (k.opportunity || 0) >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
                                {k.opportunity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> SEO Recommendations</CardTitle>
              <CopyButton text={result.recommendations} />
            </CardHeader>
            <CardContent><Markdown content={result.recommendations} /></CardContent>
          </Card>

          {/* Action plan */}
          <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-emerald-600" /> 30-Day SEO Action Plan</CardTitle>
              <CopyButton text={result.actionPlan} />
            </CardHeader>
            <CardContent><Markdown content={result.actionPlan} /></CardContent>
          </Card>
        </div>
      )}

      {!result && !busy && history.length === 0 && !loadingHistory && (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No SEO reports yet"
          description="Enter a URL above to run a full SEO audit: on-page signals, keyword research, issue prioritization, and a 30-day action plan."
        />
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">SEO Report History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 shrink-0"><Search className="h-4 w-4" /></div>
                    <button onClick={() => viewHistory(h.id)} className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-medium truncate">{h.domain || h.url}</div>
                      <div className="text-xs text-muted-foreground truncate">{h.url}</div>
                    </button>
                    <Badge variant="secondary" className="tabular-nums">{h.overallScore}/100</Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewHistory(h.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteHistory(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditItem({ label, value, sub, warn }: { label: string; value: any; sub?: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-medium mt-0.5 break-words", warn && "text-amber-600")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
