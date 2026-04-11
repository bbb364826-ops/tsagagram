import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await req.json();
  const existing = await prisma.broadcastSub.findUnique({ where: { userId_channelId: { userId: session.userId, channelId } } });

  if (existing) {
    await prisma.broadcastSub.delete({ where: { userId_channelId: { userId: session.userId, channelId } } });
    return NextResponse.json({ subscribed: false });
  } else {
    await prisma.broadcastSub.create({ data: { userId: session.userId, channelId } });
    return NextResponse.json({ subscribed: true });
  }
}
