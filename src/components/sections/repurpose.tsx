"use client";

import * as React from "react";
import {
  Repeat2,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  ChevronLeft,
  Instagram,
  Linkedin,
  Twitter,
  Mail,
  Megaphone,
  Lightbulb,
  FileText,
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
import { EmptyState, CopyButton } from "@/components/shared";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  "Distilling key takeaways from source",
  "Generating platform-native social posts",
  "Writing 3-email nurture sequence",
  "Drafting 3 ad-copy angles",
];

const SOURCE_TYPES = [
  { value: "blog", label: "Blog post / article", icon: FileText },
  { value: "analysis", label: "Website analysis report", icon: Eye },
  { value: "topic", label: "Topic / notes", icon: Lightbulb },
  { value: "url", label: "URL content", icon: Repeat2 },
];

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return <Instagram className="h-3.5 w-3.5" />;
  if (p.includes("linkedin")) return <Linkedin className="h-3.5 w-3.5" />;
  if (p.includes("x") || p.includes("twitter")) return <Twitter className="h-3.5 w-3.5" />;
  return <Repeat2 className="h-3.5 w-3.5" />;
}

export function RepurposeSection() {
  const [view, setView] = React.useState<"list" | "new" | "detail">("list");
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/repurpose", { retries: 3 });
      setHistory(data);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  async function deleteProject(id: string) {
    try {
      await apiFetch(`/api/repurpose/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {view === "list" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Content Repurposing</h2>
              <p className="text-sm text-muted-foreground">One source → social posts + email sequence + ad copy. Cross-agent orchestration.</p>
            </div>
            <Button onClick={() => setView("new")} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <Sparkles className="h-4 w-4 mr-1.5" /> Repurpose Content
            </Button>
          </div>

          {/* How it works */}
          <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Repeat2 className="h-5 w-5 text-cyan-600" />
                <h3 className="font-semibold">Turn one piece of content into a full campaign</h3>
              </div>
              <div className="grid sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-bold">1</span>
                  <span className="text-muted-foreground">Paste blog/article/notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-bold">2</span>
                  <span className="text-muted-foreground">Agent distills key takeaways</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-bold">3</span>
                  <span className="text-muted-foreground">Spins into 3 channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-bold">4</span>
                  <span className="text-muted-foreground">Copy any asset</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Repeat2 className="h-10 w-10" />}
              title="No repurpose projects yet"
              description="Paste a blog post, article, or your notes. The ContentRepurposer agent will spin it into platform-native social posts, a 3-email sequence, and 3 ad-copy angles."
              action={<Button onClick={() => setView("new")}><Sparkles className="h-4 w-4 mr-1.5" /> Repurpose Content</Button>}
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {history.map((h) => (
                <Card key={h.id} className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer" onClick={() => openDetail(h.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{h.sourceType}</Badge>
                          <h3 className="font-semibold truncate">{h.sourceTitle}</h3>
                        </div>
                        {h.brand && <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.brand}</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteProject(h.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === "new" && (
        <NewRepurposeForm onBack={() => setView("list")} onCreated={(id) => { load(); openDetail(id); }} />
      )}

      {view === "detail" && selectedId && (
        <RepurposeDetail id={selectedId} onBack={() => { setView("list"); load(); }} />
      )}
    </div>
  );
}

function NewRepurposeForm({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = React.useState({
    sourceType: "blog",
    sourceTitle: "",
    sourceContent: "",
    brand: "",
    audience: "",
  });
  const [busy, setBusy] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const timers: any[] = [];
    STEPS.forEach((_, i) => timers.push(setTimeout(() => setStepIdx(i), i * 5000)));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function submit() {
    if (!form.sourceTitle || !form.sourceContent) {
      toast.error("Title and content are required");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<any>("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        retries: 1,
      });
      toast.success("Content repurposed");
      onCreated(data.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-cyan-600" /> Repurpose Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Source type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SOURCE_TYPES.map((s) => {
                const Icon = s.icon;
                const active = form.sourceType === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, sourceType: s.value })}
                    className={cn("flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all", active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Source title *">
            <Input value={form.sourceTitle} onChange={(e) => setForm({ ...form, sourceTitle: e.target.value })} placeholder="How AI is reshaping email marketing" />
          </Field>
          <Field label="Source content * (paste your blog post, article, analysis report, or notes)">
            <Textarea
              value={form.sourceContent}
              onChange={(e) => setForm({ ...form, sourceContent: e.target.value })}
              placeholder="Paste the full content here. The agent will distill key takeaways and spin them into multi-channel assets."
              rows={10}
              className="font-mono text-xs"
            />
            <div className="text-[11px] text-muted-foreground mt-1">{form.sourceContent.length} characters {form.sourceContent.length > 8000 && "(will be truncated to 8000 for processing)"}</div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Brand (optional)"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="MarketMind AI" /></Field>
            <Field label="Audience (optional)"><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="SaaS founders" /></Field>
          </div>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Repurpose into multi-channel campaign
          </Button>
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3"><Loader2 className="h-4 w-4 animate-spin text-cyan-500" /><span className="text-sm font-medium">ContentRepurposer agent is working…</span></div>
            <div className="space-y-2.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground")}>
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  <span className={cn("text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RepurposeDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [project, setProject] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<any>(`/api/repurpose/${id}`, { retries: 3 });
        setProject(data);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!project || !project.outputs) return <EmptyState title="Project not found" />;

  const o = project.outputs;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back to repurpose projects</Button>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{project.sourceType}</Badge>
                <h2 className="text-xl font-semibold">{project.sourceTitle}</h2>
              </div>
              {project.brand && <p className="text-sm text-muted-foreground mt-0.5">{project.brand}{project.audience ? ` · ${project.audience}` : ""}</p>}
            </div>
          </div>
          {o.summary && (
            <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
              <span className="font-semibold">Summary: </span>{o.summary}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key takeaways */}
      {o.keyTakeaways?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Key Takeaways</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {o.keyTakeaways.map((k: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">{i + 1}</span>
                  <span className="text-muted-foreground">{k}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Social posts */}
      {o.socialPosts?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-600" />
            <h3 className="font-semibold">Social Posts</h3>
            <Badge variant="secondary">{o.socialPosts.length}</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-3">
            {o.socialPosts.map((p: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] capitalize"><PlatformIcon platform={p.platform} /><span className="ml-1">{p.platform}</span></Badge>
                      <CopyButton text={`${p.hook}\n\n${p.caption}`} />
                    </div>
                    <div className="text-sm font-semibold italic">&ldquo;{p.hook}&rdquo;</div>
                    <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed bg-muted/40 rounded-md p-2.5 max-h-48 overflow-y-auto scroll-thin">{p.caption}</pre>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Email sequence */}
      {o.emailSequence?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold">Email Sequence</h3>
            <Badge variant="secondary">{o.emailSequence.length} emails</Badge>
          </div>
          <div className="space-y-2">
            {o.emailSequence.map((e: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white text-[10px] font-bold">{e.step}</span>
                      <span className="text-sm font-semibold">{e.subject}</span>
                    </div>
                    <CopyButton text={`Subject: ${e.subject}\n\n${e.body}`} />
                  </div>
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed bg-muted/40 rounded-md p-3">{e.body}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ad copies */}
      {o.adCopies?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-rose-600" />
            <h3 className="font-semibold">Ad Copies</h3>
            <Badge variant="secondary">{o.adCopies.length} angles</Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-3">
            {o.adCopies.map((a: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] capitalize">{a.angle}</Badge>
                    <CopyButton text={`Headline: ${a.headline}\n\n${a.body}\n\nCTA: ${a.cta}`} />
                  </div>
                  <div className="text-sm font-bold">{a.headline}</div>
                  <p className="text-xs text-muted-foreground">{a.body}</p>
                  <Badge className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300">{a.cta}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
