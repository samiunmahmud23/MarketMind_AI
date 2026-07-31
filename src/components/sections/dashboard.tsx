"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Mail,
  Search,
  PenTool,
  FileText,
  Users,
  TrendingUp,
  Sparkles,
  Activity,
  Share2,
  Flame,
  Target,
  Zap,
  Repeat2,
  Settings,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreRing, StatCard, ShimmerSkeleton } from "@/components/shared";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { toast } from "sonner";
import type { SectionId } from "@/components/app-shell";

interface DashboardData {
  counts: {
    analyses: number;
    campaigns: number;
    seoReports: number;
    copyAssets: number;
    contentProjects: number;
    recipients: number;
    variants: number;
    socialCampaigns: number;
    socialPosts: number;
    scoredLeads: number;
    hotLeads: number;
    brandProfiles: number;
    repurposeProjects: number;
  };
  avgSeoScore: number;
  recentAnalyses: any[];
  recentCampaigns: any[];
  recentSocial: any[];
  smtp: { configured: boolean; provider?: string; fromEmail?: string };
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export function DashboardSection({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DashboardData>("/api/dashboard", { retries: 3 });
      setData(data);
    } catch (e) {
      if (e instanceof ApiError && e.isServerDown) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const stats = data
    ? [
        { label: "Website Analyses", value: data.counts.analyses, icon: Globe, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", section: "analysis" as SectionId },
        { label: "Email Campaigns", value: data.counts.campaigns, icon: Mail, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", section: "campaigns" as SectionId },
        { label: "SEO Reports", value: data.counts.seoReports, icon: Search, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", section: "seo" as SectionId },
        { label: "Copy Assets", value: data.counts.copyAssets, icon: PenTool, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", section: "copywriting" as SectionId },
        { label: "Content Projects", value: data.counts.contentProjects, icon: FileText, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", section: "content" as SectionId },
        { label: "Social Campaigns", value: data.counts.socialCampaigns, icon: Share2, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10", section: "social" as SectionId },
        { label: "Repurposed", value: data.counts.repurposeProjects, icon: Repeat2, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", section: "repurpose" as SectionId },
        { label: "Hot Leads", value: data.counts.hotLeads, icon: Flame, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", section: "campaigns" as SectionId },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero — mesh gradient + glass */}
      <motion.div initial="hidden" animate="show" variants={fadeUp}>
        <div className="mesh-gradient relative overflow-hidden rounded-3xl border border-border/50 shadow-ambient-lg">
          {/* Decorative glow orbs */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-amber-400/5 blur-3xl" />

          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary mb-4">
                  <Sparkles className="h-3 w-3" />
                  Autonomous Multi-Agent System
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Your AI marketing agency,
                  <br />
                  <span className="text-gradient">on autopilot.</span>
                </h2>
                <p className="mt-3 text-muted-foreground text-sm md:text-base leading-relaxed max-w-lg">
                  8 specialized agents analyze websites, generate cold email campaigns, SEO reports, copywriting, content & social — all in-house, no n8n.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={() => onNavigate("analysis")} className="btn-press h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Globe className="h-4 w-4 mr-2" /> Analyze a website
                  </Button>
                  <Button onClick={() => onNavigate("social")} variant="outline" className="btn-press h-10 px-5 border-border bg-background/50 hover:bg-muted">
                    <Share2 className="h-4 w-4 mr-2" /> Social Studio
                  </Button>
                </div>
              </div>

              {/* SEO Score ring */}
              <div className="flex flex-col items-center justify-center rounded-2xl glass-strong p-6 shadow-ambient">
                <ScoreRing value={data?.avgSeoScore ?? 0} size={130} label="Avg SEO" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat grid — glass cards with hover lift */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-32" />
            ))
          : stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp}>
                <StatCard
                  icon={s.icon}
                  label={s.label}
                  value={s.value}
                  color={s.color}
                  bg={s.bg}
                  onClick={() => onNavigate(s.section)}
                />
              </motion.div>
            ))}
      </motion.div>

      {/* Recent activity — 3 columns */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent analyses */}
        <RecentCard
          icon={Globe}
          color="text-emerald-600 dark:text-emerald-400"
          title="Recent Analyses"
          onAll={() => onNavigate("analysis")}
          loading={loading}
          items={data?.recentAnalyses?.map((a) => ({
            id: a.id,
            title: a.title || a.url,
            subtitle: a.industry || a.url,
            badge: a.scores?.overall != null ? `${Math.round(a.scores.overall)}/100` : undefined,
          })) || []}
          onNavigate={() => onNavigate("analysis")}
          emptyText="No analyses yet."
        />

        {/* Recent campaigns */}
        <RecentCard
          icon={Mail}
          color="text-amber-600 dark:text-amber-400"
          title="Recent Campaigns"
          onAll={() => onNavigate("campaigns")}
          loading={loading}
          items={data?.recentCampaigns?.map((c) => ({
            id: c.id,
            title: c.name,
            subtitle: `${c.productName} · ${c.tone}`,
            badge: `${c.recipientCount} recipients`,
          })) || []}
          onNavigate={() => onNavigate("campaigns")}
          emptyText="No campaigns yet."
        />

        {/* Recent social */}
        <RecentCard
          icon={Share2}
          color="text-pink-600 dark:text-pink-400"
          title="Recent Social"
          onAll={() => onNavigate("social")}
          loading={loading}
          items={data?.recentSocial?.map((s) => ({
            id: s.id,
            title: s.brand,
            subtitle: s.product,
            badge: `${s.postCount} posts`,
          })) || []}
          onNavigate={() => onNavigate("social")}
          emptyText="No social campaigns yet."
        />
      </div>

      {/* Capabilities grid */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold tracking-tight">Agent Capabilities</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="glass card-hover rounded-2xl p-5"
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="mt-3 text-sm font-semibold tracking-tight">{c.title}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CAPABILITIES: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  { icon: Globe, title: "WebsiteAnalyst", desc: "Reads any URL/FB/IG page, extracts brand signals, runs SWOT + scoring, produces a full report.", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  { icon: Mail, title: "EmailCopywriter", desc: "Researches SEO keywords, writes 1-3 cold email drafts (pain/outcome/authority) + nurture sequence.", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { icon: Target, title: "LeadScorer", desc: "Scores every CSV recipient for ICP fit (hot/warm/cold) using domain & email-signal heuristics.", color: "text-orange-600 dark:text-orange-400 bg-orange-500/10" },
  { icon: Search, title: "SeoStrategist", desc: "Audits on-page SEO, finds keyword gaps, scores 4 dimensions, outputs recommendations + 30-day action plan.", color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  { icon: PenTool, title: "Copywriter", desc: "Generates ad copy, landing pages, headlines, CTAs & social posts tuned per platform.", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
  { icon: FileText, title: "ContentStrategist", desc: "Writes SEO blog/pillar articles, content calendars & strategies with keyword research.", color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  { icon: Share2, title: "SocialMediaAgent", desc: "Platform-native posts for FB, IG, LinkedIn & X — content pillars, hashtag bank, posting cadence.", color: "text-pink-600 dark:text-pink-400 bg-pink-500/10" },
  { icon: Repeat2, title: "ContentRepurposer", desc: "One source → multi-channel: distills key takeaways, spins into social posts + email + ad copies.", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
  { icon: Settings, title: "Brand Profiles", desc: "Reusable brand configs (tone, audience, keywords, voice) auto-applied as defaults across all agents.", color: "text-slate-600 dark:text-slate-400 bg-slate-500/10" },
  { icon: TrendingUp, title: "Pipeline orchestration", desc: "Each agent chains web-reader → web-search → LLM like LangGraph nodes. No n8n, fully in-house.", color: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  { icon: Zap, title: "All free-tier", desc: "SQLite database, z-ai-web-dev-sdk backend, Next.js 16. Zero paid services required to run.", color: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10" },
];

function RecentCard({
  icon: Icon,
  color,
  title,
  onAll,
  loading,
  items,
  onNavigate,
  emptyText,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  onAll: () => void;
  loading: boolean;
  items: { id: string; title: string; subtitle: string; badge?: string }[];
  onNavigate: () => void;
  emptyText: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 shadow-ambient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        <button onClick={onAll} className="btn-press text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
          All <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="h-14" />)
        ) : items.length > 0 ? (
          items.map((item) => (
            <button
              key={item.id}
              onClick={onNavigate}
              className="btn-press w-full text-left flex items-center gap-3 rounded-xl p-2.5 hover:bg-muted/50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
              </div>
              {item.badge && (
                <Badge variant="outline" className="text-[10px] font-medium tabular-nums shrink-0">{item.badge}</Badge>
              )}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground/60 py-6 text-center">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
