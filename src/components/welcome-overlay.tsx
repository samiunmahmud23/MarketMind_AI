"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, Globe, Mail, Search, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

interface Step {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

const STEPS: Step[] = [
  { icon: Globe, title: "Analyze any website", desc: "Paste a URL and get a full marketing audit — scores, SWOT, recommendations.", color: "text-emerald-600 bg-emerald-500/10" },
  { icon: Mail, title: "Cold email campaigns", desc: "Upload a CSV, generate 1-3 AI drafts, pick the best, send personalized emails.", color: "text-amber-600 bg-amber-500/10" },
  { icon: Search, title: "SEO + AI-SEO reports", desc: "On-page audits, keyword research, GEO/AEO optimization for AI search engines.", color: "text-sky-600 bg-sky-500/10" },
  { icon: Share2, title: "Social + Content + Repurpose", desc: "Platform-native posts, blog articles, and cross-channel content from one source.", color: "text-pink-600 bg-pink-500/10" },
];

/**
 * First-visit welcome overlay.
 * Shows a premium animated onboarding tour with 4 quick-start cards.
 * Dismissed state is stored in localStorage so it only shows once.
 */
export function WelcomeOverlay({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Only show on first visit (no localStorage key)
    const seen = typeof window !== "undefined" && localStorage.getItem("mm-welcome-seen");
    if (!seen) {
      // Small delay for the page to settle
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("mm-welcome-seen", "1");
    }
  }

  function goTo(section: string) {
    dismiss();
    onNavigate(section);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-ambient-xl overflow-hidden"
          >
            {/* Header with gradient */}
            <div className="relative overflow-hidden mesh-gradient p-8 pb-6">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div>
                  <BrandLogo size="md" className="mb-3" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary mb-3">
                    <Sparkles className="h-3 w-3" /> Welcome to MarketMind AI
                  </div>
                </div>
                  <h2 className="text-2xl font-bold tracking-tight">Your AI marketing agency, ready to go.</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    12 autonomous agents are ready to analyze, write, and send — all in-house, no n8n. Here's how to get started:
                  </p>
                </div>
                <button onClick={dismiss} className="btn-press h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick-start cards */}
            <div className="p-6 pt-4 grid sm:grid-cols-2 gap-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    onClick={() => goTo(["analysis", "campaigns", "seo", "social"][i])}
                    className="btn-press group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110", step.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{step.title}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-border/50 mx-6 pt-4">
              <p className="text-[11px] text-muted-foreground">Tip: Press <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono">⌘K</kbd> to search everything</p>
              <Button onClick={dismiss} variant="outline" className="btn-press h-8 text-xs">Skip tour</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
