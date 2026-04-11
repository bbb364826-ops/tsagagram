import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friends = await prisma.closeFriend.findMany({
    where: { ownerId: session.userId },
    include: { friend: { select: { id: true, username: true, avatar: true, name: true } } },
  });
  return NextResponse.json(friends.map(f => f.friend));
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendId } = await req.json();
  const existing = await prisma.closeFriend.findUnique({ where: { ownerId_friendId: { ownerId: session.userId, friendId } } });

  if (existing) {
    await prisma.closeFriend.delete({ where: { ownerId_friendId: { ownerId: session.userId, friendId } } });
    return NextResponse.json({ added: false });
  } else {
    await prisma.closeFriend.create({ data: { ownerId: session.userId, friendId } });
    return NextResponse.json({ added: true });
  }
}
