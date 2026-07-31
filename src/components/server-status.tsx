"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { checkServerHealth } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";

/**
 * Polls /api/dashboard every 20s. If the server is unreachable OR returns
 * HTML (gateway 502 while dev server restarts), shows a sticky banner with
 * a retry button. This prevents the "Unexpected token '<'" crash and tells
 * the user exactly what's happening.
 */
export function ServerStatusBanner() {
  const [status, setStatus] = React.useState<"up" | "down">("up");
  const [checking, setChecking] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    const s = await checkServerHealth();
    setStatus(s);
    setChecking(false);
  }, []);

  React.useEffect(() => {
    check();
    const id = setInterval(check, 20000);
    // Also re-check when the window regains focus
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  return (
    <AnimatePresence>
      {status === "down" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="sticky top-0 z-50 flex items-center gap-3 bg-amber-500 text-amber-950 px-4 py-2.5 text-sm shadow-lg"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            The dev server is restarting. Some actions may fail — please retry in a few seconds.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={check}
            disabled={checking}
            className="ml-auto h-7 border-amber-900/30 bg-white/20 text-amber-950 hover:bg-white/30"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Retry
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
