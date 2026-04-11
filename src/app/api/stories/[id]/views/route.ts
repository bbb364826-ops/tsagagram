import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: list viewers (only story owner)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const { id } = await params;
  const story = await prisma.story.findUnique({ where: { id } });
  if (!story || story.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const views = await prisma.storyView.findMany({
    where: { storyId: id },
    include: { user: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(views);
}

// POST: record a view
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true });

  const { id } = await params;

  await prisma.storyView.upsert({
    where: { userId_storyId: { userId: session.userId, storyId: id } },
    create: { userId: session.userId, storyId: id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
