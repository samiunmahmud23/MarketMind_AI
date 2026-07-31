"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Mail,
  Search as SeoIcon,
  PenTool,
  FileText,
  Share2,
  Repeat2,
  CornerDownLeft,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import type { SectionId } from "@/components/app-shell";

interface SearchResults {
  analyses: any[];
  campaigns: any[];
  seoReports: any[];
  copyAssets: any[];
  contentProjects: any[];
  socialCampaigns: any[];
  repurposeProjects: any[];
}

interface Group {
  label: string;
  section: SectionId;
  icon: any;
  color: string;
  items: { id: string; title: string; subtitle: string }[];
}

export function GlobalSearch({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (section: SectionId, id?: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard: Cmd/Ctrl+K to open
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Debounced search
  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiFetch<{ results: SearchResults; total: number }>(
          `/api/search?q=${encodeURIComponent(query)}`,
          { retries: 1 }
        );
        setResults(data.results);
      } catch (e) {
        if (e instanceof ApiError && e.isServerDown) {
          // silent — banner handles it
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const groups: Group[] = React.useMemo(() => {
    if (!results) return [];
    return [
      {
        label: "Website Analyses",
        section: "analysis",
        icon: Globe,
        color: "text-emerald-600 bg-emerald-500/10",
        items: results.analyses.map((a) => ({
          id: a.id,
          title: a.title || a.url,
          subtitle: a.industry || a.url,
        })),
      },
      {
        label: "Email Campaigns",
        section: "campaigns",
        icon: Mail,
        color: "text-amber-600 bg-amber-500/10",
        items: results.campaigns.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: `${c.productName} · ${c.status}`,
        })),
      },
      {
        label: "SEO Reports",
        section: "seo",
        icon: SeoIcon,
        color: "text-sky-600 bg-sky-500/10",
        items: results.seoReports.map((s) => ({
          id: s.id,
          title: s.domain || s.url,
          subtitle: `Score ${s.overallScore}/100`,
        })),
      },
      {
        label: "Copy Assets",
        section: "copywriting",
        icon: PenTool,
        color: "text-rose-600 bg-rose-500/10",
        items: results.copyAssets.map((c) => ({
          id: c.id,
          title: `${c.brand} · ${c.product}`,
          subtitle: `${c.type}${c.platform ? ` · ${c.platform}` : ""}`,
        })),
      },
      {
        label: "Content Projects",
        section: "content",
        icon: FileText,
        color: "text-violet-600 bg-violet-500/10",
        items: results.contentProjects.map((c) => ({
          id: c.id,
          title: c.title || c.topic,
          subtitle: `${c.type} · ${c.wordCount} words`,
        })),
      },
      {
        label: "Social Campaigns",
        section: "social",
        icon: Share2,
        color: "text-pink-600 bg-pink-500/10",
        items: results.socialCampaigns.map((s) => ({
          id: s.id,
          title: s.brand,
          subtitle: s.product,
        })),
      },
      {
        label: "Repurpose Projects",
        section: "repurpose",
        icon: Repeat2,
        color: "text-cyan-600 bg-cyan-500/10",
        items: results.repurposeProjects.map((r) => ({
          id: r.id,
          title: r.sourceTitle,
          subtitle: `${r.sourceType}${r.brand ? ` · ${r.brand}` : ""}`,
        })),
      },
    ].filter((g) => g.items.length > 0);
  }, [results]);

  const totalItems = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-border/60 bg-popover/90 backdrop-blur-xl shadow-ambient-xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b border-border/50">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search analyses, campaigns, content, social, repurpose…"
                className="flex-1 h-13 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading && (
                <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin" />
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="btn-press h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto scroll-thin">
              {query.trim().length < 2 ? (
                <div className="px-4 py-10 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10 mb-3">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Search everything</p>
                  <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters · <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono">Esc</kbd> to close</p>
                </div>
              ) : groups.length === 0 && !loading ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                <div className="py-2">
                  {groups.map((group) => (
                    <div key={group.section} className="px-2">
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md", group.color)}>
                          <group.icon className="h-3 w-3" />
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                        <span className="text-[10px] text-muted-foreground/50">· {group.items.length}</span>
                      </div>
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(group.section, item.id);
                            onOpenChange(false);
                          }}
                          className="btn-press w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-accent text-left group transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                          </div>
                          <CornerDownLeft className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  ))}
                  {totalItems > 0 && (
                    <div className="px-4 py-2.5 mt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      {totalItems} result{totalItems !== 1 ? "s" : ""} across {groups.length} categor{groups.length !== 1 ? "ies" : "y"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
