import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const streamId = req.nextUrl.searchParams.get("streamId");
  const where = streamId ? { id: streamId, active: true } : { active: true };
  const streams = await prisma.liveStream.findMany({
    where,
    orderBy: { viewers: "desc" },
    select: {
      id: true, title: true, viewers: true, createdAt: true,
      user: { select: { id: true, username: true, avatar: true, verified: true } },
    },
  });
  return NextResponse.json(streams);
}

// PATCH: join / leave — increment or decrement viewer count
export async function PATCH(req: NextRequest) {
  const { streamId, action } = await req.json();
  if (!streamId) return NextResponse.json({ error: "streamId required" }, { status: 400 });

  const delta = action === "leave" ? -1 : 1;
  await prisma.liveStream.updateMany({
    where: { id: streamId, active: true },
    data: { viewers: { increment: delta } },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  // End any existing active streams for this user
  await prisma.liveStream.updateMany({ where: { userId: session.userId, active: true }, data: { active: false, endedAt: new Date() } });

  const stream = await prisma.liveStream.create({
    data: { title: title || "Live Stream", userId: session.userId },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return NextResponse.json(stream);
}
