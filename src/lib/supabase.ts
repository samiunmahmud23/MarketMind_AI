/**
 * MarketMind AI — Supabase Client Utilities
 *
 * Two clients:
 *  - createBrowserClient()  → use in Client Components / browser
 *  - createServerClient()   → use in Server Components / API routes / middleware
 *
 * The primary database layer is Prisma (ORM over the same Supabase PostgreSQL).
 * Use the Supabase client for:
 *   - Realtime subscriptions
 *   - Storage (file uploads)
 *   - Edge Functions calls
 *   - Any raw SQL or RPC you prefer over Prisma
 */

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createServerClient as _createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Only warn — don't crash the app if Supabase client features aren't used
  if (typeof window !== "undefined") {
    console.warn("[MarketMind] Supabase env vars not set. Client features disabled.");
  }
}

// ─── Browser (Client Component) client ───────────────────────────────────────
export function createBrowserClient() {
  return _createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

// ─── Server (Server Component / API Route) client ────────────────────────────
export async function createServerClientAsync() {
  const cookieStore = await cookies();
  return _createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — ignore (middleware handles refresh)
        }
      },
    },
  });
}

// ─── Convenience singleton for client-side use ───────────────────────────────
let _browserClient: ReturnType<typeof _createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseClient() can only be called in the browser. Use createServerClientAsync() in server context.");
  }
  if (!_browserClient) {
    _browserClient = createBrowserClient();
  }
  return _browserClient;
}
