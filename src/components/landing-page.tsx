"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Globe,
  Mail,
  Search,
  PenTool,
  FileText,
  Share2,
  Repeat2,
  Brain,
  Users,
  Gauge,
  Code2,
  Network,
  ShieldCheck,
  Check,
  ArrowRight,
  Moon,
  Sun,
  X,
  Loader2,
  Zap,
  Star,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { BrandLogo, BrandLogoWithText } from "@/components/brand-logo";

type AuthMode = "login" | "register";

const FEATURES = [
  { icon: Globe, title: "Website Analysis", desc: "Full audit with SWOT, 7-dimension scoring & strategic recommendations.", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  { icon: Mail, title: "Cold Email Campaigns", desc: "Upload CSV → generate 1-3 AI drafts → pick the best → send personalized by name.", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { icon: Search, title: "SEO + AI-SEO Reports", desc: "On-page audits, keyword research & GEO/AEO optimization for AI search engines.", color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  { icon: PenTool, title: "Copywriting Studio", desc: "Ad copy, landing pages, headlines, CTAs & social posts per platform.", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
  { icon: FileText, title: "Content Studio", desc: "SEO blog/pillar articles, content calendars & strategies with keyword research.", color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  { icon: Share2, title: "Social Studio", desc: "Platform-native posts for FB, IG, LinkedIn & X + content pillars + cadence.", color: "text-pink-600 dark:text-pink-400 bg-pink-500/10" },
  { icon: Repeat2, title: "Content Repurposing", desc: "One source → social posts + email sequence + ad copies (cross-agent).", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
  { icon: Brain, title: "AI-SEO (GEO/AEO)", desc: "Get cited by ChatGPT, Perplexity & AI Overviews. Generates llms.txt.", color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  { icon: Users, title: "Competitor Profiling", desc: "Research any competitor from their URL — pricing, positioning, strengths.", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { icon: Gauge, title: "CRO Audit", desc: "Conversion rate optimization audit — 6-dimension scorecard + prioritized issues.", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
  { icon: Code2, title: "Schema Markup", desc: "Generate JSON-LD structured data + audit existing schema.", color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  { icon: Network, title: "LangGraph + RAG", desc: "Multi-agent orchestration with parallel execution & knowledge base retrieval.", color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
];

const PRICING = [
  { name: "Free", price: "$0", period: "/mo", desc: "For trying out the agents", features: ["10 website analyses", "5 email campaigns", "50 emails/mo", "SEO reports", "Copywriting"], cta: "Start Free", highlight: false },
  { name: "Starter", price: "$19", period: "/mo", desc: "For solo marketers", features: ["Everything in Free", "Real email sending", "Social Studio", "Lead Scoring", "Campaign Analytics"], cta: "Get Starter", highlight: false },
  { name: "Pro", price: "$49", period: "/mo", desc: "For growing teams", features: ["Everything in Starter", "Content Repurposing", "LangGraph + RAG", "Scheduled emails", "Priority support"], cta: "Get Pro", highlight: true },
  { name: "Agency", price: "$149", period: "/mo", desc: "For agencies", features: ["Everything in Pro", "Unlimited everything", "White-label", "Multi-brand profiles", "API access"], cta: "Get Agency", highlight: false },
];

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [authMode, setAuthMode] = React.useState<AuthMode | null>(null);
  const [authChecking, setAuthChecking] = React.useState(false);

  // Check if auth is already set up
  const [authEnabled, setAuthEnabled] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<any>("/api/auth/setup", { retries: 2 });
        setAuthEnabled(data.authEnabled);
      } catch { /* non-fatal */ }
    })();
  }, []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav bar */}
      <nav className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <BrandLogoWithText size="md" />
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#agents" className="hover:text-foreground transition-colors">Agents</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-press h-9 w-9 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="ghost" className="btn-press h-9 text-sm" onClick={() => openAuth("login")}>Login</Button>
            <Button className="btn-press h-9 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => openAuth("register")}>
              Get Started <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden mesh-gradient">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-amber-400/5 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary mb-6">
              <Zap className="h-3 w-3" /> 12 Autonomous AI Agents · No n8n
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Your AI marketing agency,
              <br />
              <span className="text-gradient">on autopilot.</span>
            </h1>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Analyze websites, run cold email campaigns, generate SEO reports, copywriting, content & social — all powered by specialized AI agents built with LangChain, LangGraph & RAG.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="btn-press h-12 px-8 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => openAuth("register")}>
                Start Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="btn-press h-12 px-8 text-base border-border bg-background/50 hover:bg-muted" onClick={() => openAuth("login")}>
                Login
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Free tier forever</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Setup in 2 minutes</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "12", label: "AI Agents" },
            { value: "18", label: "Data Models" },
            { value: "47", label: "API Routes" },
            { value: "100%", label: "Free Tier" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="text-3xl font-bold tracking-tight text-gradient">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to run marketing</h2>
          <p className="mt-2 text-muted-foreground">12 specialized agents, one platform. Built in-house with LangChain + LangGraph + RAG.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="glass card-hover rounded-2xl p-5"
              >
                <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", f.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Agents showcase */}
      <section id="agents" className="border-y border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Autonomous multi-agent system</h2>
            <p className="mt-2 text-muted-foreground">Each agent chains web-reader → web-search → LLM like LangGraph nodes.</p>
          </div>
          <div className="glass-strong rounded-2xl p-6 md:p-8 shadow-ambient">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { name: "WebsiteAnalyst", desc: "SWOT + 7-dimension scoring", icon: Globe },
                { name: "EmailCopywriter", desc: "1-3 drafts + nurture sequence", icon: Mail },
                { name: "LeadScorer", desc: "Hot/warm/cold ICP fit scoring", icon: ShieldCheck },
                { name: "SeoStrategist", desc: "Audit + 30-day action plan", icon: Search },
                { name: "Copywriter", desc: "Ads, landing, headlines, CTAs", icon: PenTool },
                { name: "ContentStrategist", desc: "Blog, pillar, calendar, strategy", icon: FileText },
                { name: "SocialMediaAgent", desc: "FB · IG · LinkedIn · X posts", icon: Share2 },
                { name: "ContentRepurposer", desc: "One source → multi-channel", icon: Repeat2 },
                { name: "AiSeoAgent", desc: "GEO/AEO + llms.txt generator", icon: Brain },
                { name: "CompetitorAgent", desc: "Pricing, positioning, gaps", icon: Users },
                { name: "CroAgent", desc: "6-dimension CRO scorecard", icon: Gauge },
                { name: "SchemaAgent", desc: "JSON-LD structured data", icon: Code2 },
              ].map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary ring-1 ring-primary/10">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-2 text-muted-foreground">Start free. Upgrade when you need real email sending.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={cn("glass-strong rounded-2xl p-6 relative", tier.highlight && "ring-2 ring-primary")}
            >
              {tier.highlight && <Badge className="absolute -top-2 right-6 bg-primary text-primary-foreground text-[10px]">POPULAR</Badge>}
              <div className="text-sm font-semibold">{tier.name}</div>
              <div className="text-3xl font-bold tracking-tight mt-1">{tier.price}<span className="text-sm font-normal text-muted-foreground">{tier.period}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{tier.desc}</div>
              <div className="mt-5 space-y-2">
                {tier.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => openAuth("register")}
                className={cn("btn-press mt-5 w-full", tier.highlight ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" : "border-border bg-background/50 hover:bg-muted")}
                variant={tier.highlight ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="glass-strong rounded-3xl p-10 md:p-14 shadow-ambient-lg">
          <BrandLogo size="xl" className="mx-auto mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Ready to automate your marketing?</h2>
          <p className="mt-2 text-muted-foreground">Join the AI marketing revolution. Free to start, no credit card required.</p>
          <Button size="lg" className="btn-press mt-6 h-12 px-8 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => openAuth("register")}>
            Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" className="h-5 opacity-60" />
            <span>· AI-driven marketing agency</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Next.js 16 · LangChain · LangGraph · RAG · z-ai-web-dev-sdk</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {authMode && (
          <AuthModal
            mode={authMode}
            authEnabled={authEnabled}
            onClose={() => setAuthMode(null)}
            onSuccess={() => { setAuthMode(null); onEnterApp(); }}
            onSwitchMode={(m) => setAuthMode(m)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ Auth Modal ============ */

function AuthModal({
  mode,
  authEnabled,
  onClose,
  onSuccess,
  onSwitchMode,
}: {
  mode: AuthMode;
  authEnabled: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: (m: AuthMode) => void;
}) {
  const [form, setForm] = React.useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!form.email || !form.password) { toast.error("Email and password required"); return; }
    if (mode === "register" && form.password.length < 6) { toast.error("Password must be 6+ characters"); return; }
    setLoading(true);
    try {
      if (mode === "register") {
        // Create the first admin account, then sign in for a real session.
        await apiFetch<any>("/api/auth/setup", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
        const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (res?.error) {
          toast.error("Account created — please log in.");
          return;
        }
        toast.success("Account created!");
        onSuccess();
      } else {
        // Demo mode (no accounts yet) → enter without a session.
        if (!authEnabled) {
          toast.info("Demo mode — no account required.");
          onSuccess();
          return;
        }
        // Real credential login → NextAuth session (data is scoped to this user).
        const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (res?.error) {
          toast.error("Invalid email or password.");
          return;
        }
        toast.success("Welcome back!");
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-ambient-xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative mesh-gradient p-6 pb-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <BrandLogoWithText size="sm" subtitle={mode === "register" ? "Create your account" : "Welcome back"} />
            <button onClick={onClose} className="btn-press h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 pt-4 space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="h-11" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Password {mode === "register" && "(min 6 chars)"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="h-11" onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>

          <Button onClick={submit} disabled={loading} className="btn-press w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {mode === "register" ? "Create Account" : "Login"}
          </Button>

          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
            <>
              <div className="relative my-1 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="btn-press flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background/50 text-sm font-medium transition-colors hover:bg-muted"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}

          <div className="text-center text-xs text-muted-foreground">
            {mode === "register" ? (
              <>Already have an account? <button onClick={() => onSwitchMode("login")} className="text-primary hover:underline font-medium">Login</button></>
            ) : (
              <>Don't have an account? <button onClick={() => onSwitchMode("register")} className="text-primary hover:underline font-medium">Register</button></>
            )}
          </div>

          {!authEnabled && mode === "login" && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-amber-700 dark:text-amber-300 text-center">
              No account set up yet — you'll enter demo mode (no login required).
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Official multi-colour Google "G" mark. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
