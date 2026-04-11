import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const following = await prisma.follow.findMany({
    where: { followerId: session.userId },
    select: { followingId: true },
  });
  const ids = [session.userId, ...following.map(f => f.followingId)];

  const notes = await prisma.note.findMany({
    where: { userId: { in: ids }, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });
  if (text.length > 60) return NextResponse.json({ error: "Max 60 characters" }, { status: 400 });

  // Delete old note
  await prisma.note.deleteMany({ where: { userId: session.userId } });

  const note = await prisma.note.create({
    data: {
      text: text.trim(),
      userId: session.userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.note.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
