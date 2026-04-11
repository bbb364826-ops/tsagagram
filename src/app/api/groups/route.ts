import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, posts: true } },
      members: { where: { userId: session.userId }, select: { id: true, role: true } },
    },
  });

  return NextResponse.json(groups.map(g => ({ ...g, isMember: g.members.length > 0, myRole: g.members[0]?.role || null })));
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, isPrivate } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name, description, isPrivate: isPrivate || false, creatorId: session.userId,
      members: { create: { userId: session.userId, role: "admin" } },
    },
    include: { _count: { select: { members: true, posts: true } } },
  });

  return NextResponse.json({ ...group, isMember: true, myRole: "admin" });
}
