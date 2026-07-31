"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client providers wrapper. Currently hosts NextAuth's SessionProvider so
 * `useSession()` / `signIn()` / `signOut()` work throughout the app.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
