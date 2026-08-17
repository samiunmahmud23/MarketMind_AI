"use client";

import * as React from "react";
import {
  Share2,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Clock,
  TrendingUp,
  Hash,
  ImageIcon,
  ChevronLeft,
  Calendar,
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
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reading brand context (optional website)",
  "Researching trending content signals",
  "Defining content pillars & cadence",
  "Writing platform-native posts",
];

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600 bg-blue-500/10", ring: "ring-blue-500/30" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600 bg-pink-500/10", ring: "ring-pink-500/30" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-sky-700 bg-sky-500/10", ring: "ring-sky-500/30" },
  { id: "x", label: "X / Twitter", icon: Twitter, color: "text-slate-700 bg-slate-500/10", ring: "ring-slate-500/30" },
];

function PlatformMeta(id: string) {
  return PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
}

export function SocialSection({ itemId }: { itemId?: string | null }) {
  const [view, setView] = React.useState<"list" | "new" | "detail">("list");
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/social", { retries: 3 });
      setHistory(data);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Auto-open specific item when navigated from global search
  React.useEffect(() => {
    if (itemId && !loading) {
      openDetail(itemId);
    }
  }, [itemId, loading]);

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  async function deleteCampaign(id: string) {
    try {
      await apiFetch(`/api/social/social-campaigns/${id}`, { method: "DELETE", json: false });
      setHistory((h) => h.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {view === "list" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Social Media Studio</h2>
              <p className="text-sm text-muted-foreground">Generate platform-native content for Facebook, Instagram, LinkedIn &amp; X.</p>
            </div>
            <Button onClick={() => setView("new")} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
              <Sparkles className="h-4 w-4 mr-1.5" /> New Campaign
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Share2 className="h-10 w-10" />}
              title="No social campaigns yet"
              description="Produces platform-native posts — different captions for FB, IG, LinkedIn and X — plus content pillars, a hashtag bank and a posting cadence."
              action={<Button onClick={() => setView("new")}><Sparkles className="h-4 w-4 mr-1.5" /> New Campaign</Button>}
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {history.map((c) => (
                <Card key={c.id} className="hover:shadow-md hover:-translate-y-1 hover:border-primary/40 transition-all cursor-pointer" onClick={() => openDetail(c.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{c.brand}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.product}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{c.postCount} posts</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {c.platforms?.map((p: string) => {
                        const m = PlatformMeta(p);
                        const Icon = m.icon;
                        return (
                          <span key={p} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", m.color)} title={m.label}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        );
                      })}
                      <span className="ml-auto text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === "new" && (
        <NewSocialForm onBack={() => setView("list")} onCreated={(id) => { load(); openDetail(id); }} />
      )}

      {view === "detail" && selectedId && (
        <SocialDetail id={selectedId} onBack={() => { setView("list"); load(); }} />
      )}
    </div>
  );
}

function NewSocialForm({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = React.useState({
    brand: "",
    product: "",
    audience: "",
    url: "",
    goal: "engagement",
    postsPerPlatform: "2",
  });
  const [platforms, setPlatforms] = React.useState<string[]>(["instagram", "linkedin"]);
  const [saving, setSaving] = React.useState(false);

  function togglePlatform(id: string) {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function submit() {
    if (!form.brand || !form.product || !form.audience) {
      toast.error("Brand, product, and audience are required");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<any>("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, platforms, postsPerPlatform: parseInt(form.postsPerPlatform) }),
        retries: 1,
      });
      toast.success("Social campaign generated");
      onCreated(data.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="h-4 w-4 text-pink-600" /> New Social Media Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Brand *"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Example Brand" /></Field>
            <Field label="Product / offer *"><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Marketing campaign offering" /></Field>
          </div>
          <Field label="Target audience *"><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="SaaS founders & marketing managers" /></Field>
          <Field label="Website URL (optional — agent reads it for context)"><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://yourbrand.com" /></Field>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Platforms * (select one or more)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const active = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]",
                      active ? cn("border-current ring-2", p.color, p.ring) : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Goal">
              <Select value={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="awareness">Brand awareness</SelectItem>
                  <SelectItem value="leads">Lead generation</SelectItem>
                  <SelectItem value="sales">Direct sales</SelectItem>
                  <SelectItem value="authority">Authority / thought leadership</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Posts per platform">
              <Select value={form.postsPerPlatform} onValueChange={(v) => setForm({ ...form, postsPerPlatform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 post</SelectItem>
                  <SelectItem value="2">2 posts</SelectItem>
                  <SelectItem value="3">3 posts</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Generate Social Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SocialDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [campaign, setCampaign] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<any>(`/api/social/social-campaigns/${id}`, { retries: 3 });
        setCampaign(data);
      } catch (e) {
        if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!campaign) return <EmptyState title="Campaign not found" />;

  // Group posts by platform
  const byPlatform: Record<string, any[]> = {};
  campaign.posts?.forEach((p: any) => {
    if (!byPlatform[p.platform]) byPlatform[p.platform] = [];
    byPlatform[p.platform].push(p);
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back to social campaigns</Button>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{campaign.brand}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{campaign.product}</p>
              <p className="text-xs text-muted-foreground mt-1">Audience: {campaign.audience}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {campaign.platforms?.map((p: string) => {
                const m = PlatformMeta(p);
                const Icon = m.icon;
                return <span key={p} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", m.color)}><Icon className="h-4 w-4" /></span>;
              })}
            </div>
          </div>
          {campaign.strategy && (
            <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Strategy: </span>{campaign.strategy}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content pillars + hashtag bank */}
      <div className="grid md:grid-cols-2 gap-4">
        {campaign.contentPillars?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-pink-600" /> Content Pillars</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {campaign.contentPillars.map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </CardContent>
          </Card>
        )}
        {campaign.hashtagBank?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Hash className="h-4 w-4 text-pink-600" /> Hashtag Bank</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scroll-thin">
              {campaign.hashtagBank.map((h: string, i: number) => (
                <span key={i} className="text-[11px] rounded-full bg-pink-500/10 text-pink-700 dark:text-pink-300 px-2 py-0.5">#{h.replace(/^#/, "")}</span>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Posting cadence */}
      {campaign.cadence?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-pink-600" /> Posting Cadence</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Day</th>
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 font-medium">Topic</th>
                </tr>
              </thead>
              <tbody>
                {campaign.cadence.map((c: any, i: number) => {
                  const m = PlatformMeta((c.platform || "").toLowerCase());
                  const Icon = m.icon;
                  return (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{c.day}</td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1.5"><Icon className={cn("h-3 w-3", m.color.split(" ")[0])} />{m.label}</span>
                      </td>
                      <td className="py-2 text-muted-foreground">{c.topic}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Posts grouped by platform */}
      {Object.keys(byPlatform).map((platform) => {
        const m = PlatformMeta(platform);
        const Icon = m.icon;
        const posts = byPlatform[platform];
        return (
          <div key={platform} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", m.color)}><Icon className="h-4 w-4" /></span>
              <h3 className="font-semibold">{m.label} posts</h3>
              <Badge variant="outline">{posts.length}</Badge>
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              {posts.map((p: any, i: number) => (
                <Card key={p.id || i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", m.color)}><Icon className="h-3.5 w-3.5" /></span>
                        <span className="text-xs font-semibold text-muted-foreground">Post {i + 1}</span>
                      </div>
                      <CopyButton text={`Hook: ${p.hook}\n\n${p.caption}\n\n${(p.hashtags || []).map((h: string) => "#" + h.replace(/^#/, "")).join(" ")}\n\nCTA: ${p.cta}`} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hook</div>
                      <div className="text-sm font-semibold italic">&ldquo;{p.hook}&rdquo;</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Caption</div>
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed bg-muted/40 rounded-md p-3 max-h-64 overflow-y-auto scroll-thin">{p.caption}</pre>
                    </div>
                    {p.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.hashtags.map((h: string, j: number) => (
                          <span key={j} className="text-[10px] rounded-full bg-pink-500/10 text-pink-700 dark:text-pink-300 px-1.5 py-0.5">#{h.replace(/^#/, "")}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {p.cta && <span className="inline-flex items-center gap-1"><span className="text-muted-foreground">CTA:</span><Badge variant="outline">{p.cta}</Badge></span>}
                      {p.bestTime && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{p.bestTime}</span>}
                      {p.estReach && (
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          p.estReach === "high" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : p.estReach === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                        )}>reach: {p.estReach}</span>
                      )}
                    </div>
                    {p.imagePrompt && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                        <ImageIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span><span className="font-semibold">Visual:</span> {p.imagePrompt}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
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
