import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Serves all NextAuth endpoints: /api/auth/signin, /api/auth/callback/google,
// /api/auth/session, /api/auth/signout, etc. The static /api/auth/setup route
// takes precedence over this catch-all for that one path.
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
