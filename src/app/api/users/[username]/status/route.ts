import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/users/[username]/status — get online/last-seen status
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  await getSession(); // auth optional — public profiles can show status

  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, lastSeen: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = Date.now();
  const lastSeen = user.lastSeen ? user.lastSeen.getTime() : null;
  const isOnline = lastSeen !== null && now - lastSeen < 5 * 60 * 1000; // 5 min window

  return NextResponse.json({ isOnline, lastSeen: user.lastSeen });
}

// POST /api/users/[username]/status — update own lastSeen (called as heartbeat)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;

  // Only allow updating own status
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user || user.id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSeen: new Date() },
  });

  return NextResponse.json({ ok: true });
}
