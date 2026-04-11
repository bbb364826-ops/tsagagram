import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json([]);

  const messages = await prisma.broadcastMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId, text, mediaUrl } = await req.json();
  const channel = await prisma.broadcastChannel.findFirst({ where: { id: channelId, userId: session.userId } });
  if (!channel) return NextResponse.json({ error: "Not channel owner" }, { status: 403 });

  const msg = await prisma.broadcastMessage.create({
    data: { channelId, userId: session.userId, text, mediaUrl },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return NextResponse.json(msg);
}
