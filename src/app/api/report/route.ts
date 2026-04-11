import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simple in-memory rate limit (per user, max 10 reports/hour)
const rateLimits = new Map<string, { count: number; reset: number }>();

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const rl = rateLimits.get(session.userId);
  if (rl && now < rl.reset && rl.count >= 10) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 });
  }
  rateLimits.set(session.userId, {
    count: (rl && now < rl.reset ? rl.count : 0) + 1,
    reset: rl && now < rl.reset ? rl.reset : now + 3600000,
  });

  const { type, targetId, reason } = await req.json();
  // type: "post" | "user" | "comment" | "story"
  // reason: "spam" | "hate" | "violence" | "nudity" | "false_info" | "other"

  if (!type || !targetId || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify target exists
  if (type === "post") {
    const post = await prisma.post.findUnique({ where: { id: targetId } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else if (type === "user") {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log report (stored as notification for now — extend schema if needed)
  // In production this would go to a moderation queue
  console.log(`[REPORT] ${session.username} reported ${type}:${targetId} for ${reason}`);

  return NextResponse.json({ ok: true, message: "Report submitted. Thank you." });
}
