import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (targetUserId === session.userId) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: session.userId, blockedId: targetUserId } },
  });

  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    return NextResponse.json({ blocked: false });
  }

  // Remove follow relations both ways
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: session.userId, followingId: targetUserId }, { followerId: targetUserId, followingId: session.userId }] },
  });
  // Remove follow requests
  await prisma.followRequest.deleteMany({
    where: { OR: [{ fromId: session.userId, toId: targetUserId }, { fromId: targetUserId, toId: session.userId }] },
  });

  await prisma.block.create({ data: { blockerId: session.userId, blockedId: targetUserId } });

  return NextResponse.json({ blocked: true });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  if (targetUserId) {
    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: session.userId, blockedId: targetUserId } },
    });
    return NextResponse.json({ blocked: !!block });
  }

  const blocks = await prisma.block.findMany({
    where: { blockerId: session.userId },
    include: { blocked: { select: { id: true, username: true, avatar: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(blocks.map(b => b.blocked));
}
