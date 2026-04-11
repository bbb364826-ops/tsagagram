import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const groups = await prisma.dmGroup.findMany({
    where: { members: { some: { userId: session.userId } } },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatar: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, memberIds } = await req.json();
  if (!memberIds?.length) return NextResponse.json({ error: "Members required" }, { status: 400 });

  const allIds = [...new Set([session.userId, ...memberIds])];

  const group = await prisma.dmGroup.create({
    data: {
      name,
      creatorId: session.userId,
      members: { create: allIds.map((id: string) => ({ userId: id })) },
    },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatar: true } } } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
