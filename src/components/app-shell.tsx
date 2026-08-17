"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, type Variants } from "framer-motion";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Globe,
  Mail,
  Search,
  PenTool,
  FileText,
  Share2,
  Repeat2,
  Settings,
  Menu,
  X,
  Zap,
  ShieldCheck,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { checkServerHealth } from "@/lib/api-fetch";
import { ServerStatusBanner } from "@/components/server-status";
import { GlobalSearch } from "@/components/global-search";
import { BrandLogo, BrandLogoWithText } from "@/components/brand-logo";

import { Image as ImageIcon } from "lucide-react"; // Import ImageIcon for the nav

export type SectionId =
  | "dashboard"
  | "analysis"
  | "campaigns"
  | "seo"
  | "copywriting"
  | "content"
  | "social"
  | "product-studio"
  | "repurpose"
  | "marketing-skills"
  | "account"
  | "settings";

const NAV: {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & activity" },
  { id: "analysis", label: "Website Analysis", icon: Globe, desc: "Audit any URL or page" },
  { id: "campaigns", label: "Cold Email", icon: Mail, desc: "CSV → AI campaigns" },
  { id: "seo", label: "SEO Reports", icon: Search, desc: "Audit & action plan" },
  { id: "copywriting", label: "Copywriting", icon: PenTool, desc: "Ads, landing, CTAs" },
  { id: "content", label: "Content Studio", icon: FileText, desc: "Blogs & strategy" },
  { id: "social", label: "Social Studio", icon: Share2, desc: "FB · IG · LinkedIn · X" },
  { id: "product-studio", label: "Product Studio", icon: ImageIcon, desc: "AI Graphic Design" },
  { id: "repurpose", label: "Repurpose", icon: Repeat2, desc: "One source → multi-channel" },
  { id: "marketing-skills", label: "Marketing Skills", icon: Zap, desc: "SEO · Competitors · CRO · Schema" },
  { id: "account", label: "Account & Billing", icon: ShieldCheck, desc: "Auth · Plans · Scheduled sends" },
  { id: "settings", label: "Settings", icon: Settings, desc: "Brand profiles & config" },
];

/* ============================================================
   System / agent readiness — polls server health (the LLM +
   API layer that the 12 agents depend on) and reflects it live.
   ============================================================ */
type AgentState = "ready" | "offline" | "checking";

function useAgentStatus(): AgentState {
  const [status, setStatus] = React.useState<AgentState>("checking");
  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const s = await checkServerHealth();
        if (alive) setStatus(s === "up" ? "ready" : "offline");
      } catch {
        if (alive) setStatus("offline");
      }
    };
    run();
    const id = setInterval(run, 20000);
    const onFocus = () => run();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return status;
}

/** Global poller for scheduled email jobs */
function useScheduledJobsPoller() {
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try { await checkServerHealth(); /* just to check alive */ await fetch("/api/scheduled-jobs/process", { method: "POST" }); }
      catch { /* non-fatal */ }
    }, 60000);
    return () => clearInterval(interval);
  }, []);
}

const STATUS_META: Record<AgentState, { color: string; pill: string; headline: string }> = {
  ready: { color: "var(--brand-mint)", pill: "Agents ready", headline: "Agents online" },
  checking: { color: "var(--muted-foreground)", pill: "Checking…", headline: "Checking status…" },
  offline: { color: "var(--destructive)", pill: "Offline", headline: "Reconnecting…" },
};

function StatusDot({ color, active, size = 1.5 }: { color: string; active: boolean; size?: number }) {
  const px = `${size * 4}px`;
  return (
    <span className="relative inline-flex shrink-0" style={{ height: px, width: px }}>
      {active && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex rounded-full" style={{ height: px, width: px, background: color }} />
    </span>
  );
}

/** Compact readiness pill for the desktop header. Fixed min-width → no CLS. */
function AgentStatusPill() {
  const status = useAgentStatus();
  const m = STATUS_META[status];
  return (
    <div
      className="hidden lg:flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium min-w-[118px] transition-colors"
      style={{
        borderColor: `color-mix(in oklch, ${m.color} 30%, transparent)`,
        background: `color-mix(in oklch, ${m.color} 9%, transparent)`,
        color: m.color,
      }}
      aria-live="polite"
    >
      <StatusDot color={m.color} active={status === "ready"} />
      {m.pill}
    </div>
  );
}

/** Expanded readiness panel for the sidebar / drawer footer. */
function AgentStatusPanel() {
  const status = useAgentStatus();
  const m = STATUS_META[status];
  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        borderColor: `color-mix(in oklch, ${m.color} 22%, transparent)`,
        background: `color-mix(in oklch, ${m.color} 7%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: m.color }}>
        <StatusDot color={m.color} active={status === "ready"} size={2} />
        {m.headline}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-sidebar-foreground/50">
        12 autonomous workflows, all in-house.
      </p>
    </div>
  );
}

/* ============================================================
   Magnetic nav item — the pill box stays fixed (so the shared
   sliding indicator measures cleanly), while the icon + label
   are pulled subtly toward the cursor via spring motion values.
   ============================================================ */
function MagneticNavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: (typeof NAV)[number];
  isActive: boolean;
  onNavigate: (id: SectionId) => void;
}) {
  const Icon = item.icon;
  const ref = React.useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 350, damping: 22, mass: 0.4 });
  const y = useSpring(my, { stiffness: 350, damping: 22, mass: 0.4 });

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 5);
  }
  function reset() {
    mx.set(0);
    my.set(0);
  }

  return (
    <button
      ref={ref}
      onClick={() => onNavigate(item.id)}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-10 w-full items-center rounded-xl px-3 text-sm font-medium outline-none transition-colors",
        isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/55 hover:text-sidebar-foreground"
      )}
    >
      {isActive && (
        <>
          {/* Sliding background indicator (shared across items) */}
          <motion.span
            layoutId="nav-active-bg"
            className="absolute inset-0 rounded-xl bg-sidebar-accent"
            style={{ border: "1px solid color-mix(in oklch, white 8%, transparent)" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
          {/* Sliding accent bar */}
          <motion.span
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
            style={{ boxShadow: "0 0 12px color-mix(in oklch, var(--brand-indigo) 65%, transparent)" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        </>
      )}
      {/* Magnetic content layer */}
      <motion.span style={{ x, y }} className="relative z-10 flex w-full items-center gap-3">
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
          )}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
      </motion.span>
    </button>
  );
}

const navContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } },
};
const navItemVariant: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* ============================================================
   Responsive drawer — CSS-transition lifecycle (mount → enter →
   exit → unmount). Deliberately NOT framer AnimatePresence: its
   exit is unreliable in this stack, and a leaked backdrop would
   make the app unclickable. Backdrop blur, body scroll-lock,
   ESC to close. Rendered only on < md.
   ============================================================ */
function MobileDrawer({
  open,
  onClose,
  active,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  onLogout?: () => void;
}) {
  // `mounted` keeps the node in the DOM through the exit animation;
  // `shown` drives the CSS enter/exit transitions one frame later.
  const [mounted, setMounted] = React.useState(open);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // Flip to the shown state a tick after mount so the transform transitions
      // in. setTimeout (not rAF) so it fires even when the tab isn't compositing.
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 320); // matches transition duration
    return () => clearTimeout(t);
  }, [open]);

  // Body scroll-lock + ESC, only while the drawer is in the DOM.
  React.useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" style={{ pointerEvents: shown ? "auto" : "none" }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        style={{ opacity: shown ? 1 : 0 }}
        onClick={onClose}
      />
      <aside
        className="elite-glass-strong absolute inset-y-0 left-0 flex w-72 flex-col text-sidebar-foreground will-change-transform"
        style={{
          transform: shown ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-16 items-center justify-between px-4">
              <BrandLogoWithText size="sm" subtitle="Marketing Agency" />
              <button
                onClick={onClose}
                className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="space-y-2 border-t border-sidebar-border px-3 py-3">
              <AgentStatusPanel />
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium text-sidebar-foreground/30">v2.0</span>
                <div className="flex items-center gap-1">
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Exit
                    </button>
                  )}
                  <ThemeToggle />
                </div>
              </div>
            </div>
      </aside>
    </div>
  );
}

export function AppShell({
  active,
  onNavigate,
  children,
  onLogout,
}: {
  active: SectionId;
  onNavigate: (id: SectionId, itemId?: string) => void;
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const current = NAV.find((n) => n.id === active)!;
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  
  // Start the background poller to process any due scheduled email jobs
  useScheduledJobsPoller();

  const handleSearchNavigate = React.useCallback(
    (section: SectionId, itemId?: string) => onNavigate(section, itemId),
    [onNavigate]
  );

  const navigate = React.useCallback(
    (id: SectionId) => {
      onNavigate(id);
      setMobileNavOpen(false);
    },
    [onNavigate]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} onNavigate={handleSearchNavigate} />
      <div className="flex flex-1">
        {/* ---------- Desktop sidebar: persistent glass rail ---------- */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl md:flex">
          {/* Brand + subtle top glow */}
          <div className="relative flex h-16 items-center px-5">
            <div
              className="pointer-events-none absolute -top-8 left-4 h-24 w-40 rounded-full opacity-40 blur-3xl"
              style={{ background: "color-mix(in oklch, var(--brand-indigo) 30%, transparent)" }}
            />
            <div className="relative">
              <BrandLogoWithText size="sm" subtitle="Marketing Agency" />
            </div>
          </div>

          {/* Nav — staggered entrance + magnetic items + shared indicator */}
          <motion.nav
            variants={navContainer}
            initial="hidden"
            animate="show"
            className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-3"
          >
            {NAV.map((item) => (
              <motion.div key={item.id} variants={navItemVariant}>
                <MagneticNavItem item={item} isActive={item.id === active} onNavigate={navigate} />
              </motion.div>
            ))}
          </motion.nav>

          {/* Footer — live agent readiness */}
          <div className="space-y-2 border-t border-sidebar-border px-3 py-3">
            <AgentStatusPanel />
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium text-sidebar-foreground/30">v2.0</span>
              <div className="flex items-center gap-1">
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    aria-label="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Exit
                  </button>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- Mobile drawer ---------- */}
        <MobileDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          active={active}
          onNavigate={navigate}
          onLogout={onLogout}
        />

        {/* ---------- Main column ---------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ServerStatusBanner />

          {/* Mobile header */}
          <header className="elite-glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-muted"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo size="sm" />
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-press ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-muted"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </header>

          {/* Desktop header — glass, sticky, animated title */}
          <header className="elite-glass sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-border px-8 md:flex">
            <div className="min-w-0">
              {/* Key-based entrance — swaps instantly + springs in on section change */}
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="truncate text-lg font-semibold tracking-tight">{current.label}</h1>
                <p className="truncate text-xs text-muted-foreground">{current.desc}</p>
              </motion.div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="btn-press hidden h-9 w-60 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted md:inline-flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search everything…</span>
                <kbd className="ml-auto rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <AgentStatusPill />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>

          {/* Footer */}
          <footer className="mt-auto border-t border-border/50 px-4 py-4 md:px-8">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <BrandLogo size="sm" className="h-4 opacity-60" />
                <span>· Autonomous marketing platform</span>
              </div>
              <span className="hidden font-mono sm:inline">SQLite · Prisma · Modern workflow tooling</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
