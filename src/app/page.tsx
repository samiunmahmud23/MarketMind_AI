"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { AppShell, type SectionId } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { DashboardSection } from "@/components/sections/dashboard";
import { WebsiteAnalysisSection } from "@/components/sections/website-analysis";
import { EmailCampaignsSection } from "@/components/sections/email-campaigns";
import { SeoSection } from "@/components/sections/seo";
import { CopywritingSection } from "@/components/sections/copywriting";
import { ContentSection } from "@/components/sections/content";
import { SocialSection } from "@/components/sections/social";
import { RepurposeSection } from "@/components/sections/repurpose";
import { MarketingSkillsSection } from "@/components/sections/marketing-skills";
import { ProductStudioSection } from "@/components/sections/product-studio";
import { AccountSection } from "@/components/sections/account";
import { SettingsSection } from "@/components/sections/settings";
import { AdminSection } from "@/components/sections/admin";
import { WelcomeOverlay } from "@/components/welcome-overlay";

// Cinematic easing (expo-out) — feels instantaneous on entry, fluid on exit.
const CINEMATIC = [0.22, 1, 0.36, 1] as const;

export default function Page() {
  const [entered, setEntered] = React.useState(false);
  const [section, setSection] = React.useState<SectionId>("dashboard");
  const [itemId, setItemId] = React.useState<string | null>(null);
  const { data: session, status } = useSession();

  // A real NextAuth session (e.g. after Google login) enters the app directly.
  React.useEffect(() => {
    if (status === "authenticated") setEntered(true);
  }, [status]);

  function navigate(id: SectionId, detailId?: string) {
    setSection(id);
    setItemId(detailId || null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function enterApp() {
    setEntered(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mm-entered", "1");
    }
  }

  function logout() {
    setEntered(false);
    setSection("dashboard");
    setItemId(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("mm-entered");
    }
    // End a NextAuth session too (no-op if signed in only via demo/credentials).
    if (status === "authenticated") signOut({ redirect: false });
  }

  // Restore the "entered" state ONLY in demo mode (no real accounts). When auth
  // is enabled, a real NextAuth session is required (handled by the effect above)
  // so data stays correctly scoped to the signed-in tenant.
  React.useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.authEnabled && typeof window !== "undefined" && sessionStorage.getItem("mm-entered") === "1") {
          setEntered(true);
        }
      })
      .catch(() => {});
  }, []);

  // Single route — no file-based routing. Landing and dashboard are two states
  // of the same page. The top-level swap is a plain conditional (only ONE view
  // is ever mounted → zero overlap, zero CLS); the cinematic feel comes from the
  // incoming view's spring entrance, so nothing depends on an exit completing.
  if (!entered) {
    return (
      <motion.div key="landing" initial={false} animate={{ opacity: 1 }}>
        <LandingPage onEnterApp={enterApp} />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="app"
      initial={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: CINEMATIC }}
    >
      <AppShell 
        active={section} 
        onNavigate={navigate} 
        onLogout={logout} 
        isAdmin={(session?.user as any)?.role === "admin"}
      >
        <WelcomeOverlay onNavigate={(s) => navigate(s as SectionId)} />
        {/* Key-based entrance (no AnimatePresence exit dependency) — the new
            section mounts and springs in instantly; only one is ever mounted. */}
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: CINEMATIC }}
        >
          {section === "dashboard" && <DashboardSection onNavigate={navigate} />}
          {section === "analysis" && <WebsiteAnalysisSection itemId={itemId} />}
          {section === "campaigns" && <EmailCampaignsSection itemId={itemId} />}
          {section === "seo" && <SeoSection itemId={itemId} />}
          {section === "copywriting" && <CopywritingSection itemId={itemId} />}
          {section === "content" && <ContentSection itemId={itemId} />}
          {section === "product-studio" && <ProductStudioSection />}
          {section === "social" && <SocialSection itemId={itemId} />}
          {section === "repurpose" && <RepurposeSection itemId={itemId} />}
          {section === "marketing-skills" && <MarketingSkillsSection />}
          {section === "account" && <AccountSection />}
          {section === "settings" && <SettingsSection />}
          {section === "admin" && <AdminSection />}
        </motion.div>
      </AppShell>
    </motion.div>
  );
}
