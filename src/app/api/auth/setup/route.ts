import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/setup
 * Creates the first admin user. Only works if no users exist yet.
 * After setup, auth is enforced — the app requires login.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;

  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Only allow setup if no REAL users exist (the demo tenant doesn't count).
    const userCount = await db.user.count({ where: { NOT: { email: "demo@local.host" } } });
    if (userCount > 0) {
      return NextResponse.json({ error: "Auth is already configured. Use the login page." }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || "Admin",
        passwordHash,
        role: "admin",
        subscriptionTier: "pro", // First user gets Pro free
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Admin account created. Auth is now enabled.",
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: user.subscriptionTier },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Setup failed" }, { status: 500 });
  }
}

/**
 * GET /api/auth/session-info
 * Returns whether auth is enabled + current session status.
 */
export async function GET() {
  try {
    const userCount = await db.user.count({ where: { NOT: { email: "demo@local.host" } } });
    return NextResponse.json({
      authEnabled: userCount > 0,
      userCount,
    });
  } catch {
    return NextResponse.json({ authEnabled: false, userCount: 0 });
  }
}
