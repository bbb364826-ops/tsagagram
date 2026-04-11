import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await prisma.broadcastChannel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      _count: { select: { subscribers: true, messages: true } },
      subscribers: { where: { userId: session.userId }, select: { id: true } },
    },
  });

  return NextResponse.json(channels.map(c => ({ ...c, isSubscribed: c.subscribers.length > 0 })));
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  const channel = await prisma.broadcastChannel.create({
    data: { name, description, userId: session.userId },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return NextResponse.json(channel);
}
