import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json([], { status: 400 });

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json([], { status: 404 });

  const highlights = await prisma.storyHighlight.findMany({
    where: { userId: user.id },
    include: {
      stories: { select: { id: true, media: true, mediaType: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(highlights);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, storyIds } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const highlight = await prisma.storyHighlight.create({
    data: {
      title,
      userId: session.userId,
      stories: storyIds?.length ? { connect: storyIds.map((id: string) => ({ id })) } : undefined,
    },
    include: { stories: { select: { id: true, media: true }, take: 1 } },
  });

  return NextResponse.json(highlight, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const h = await prisma.storyHighlight.findUnique({ where: { id } });
  if (!h || h.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.storyHighlight.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
