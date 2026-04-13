import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/hashtags/[tag]/follow — check if following
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tag: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ following: false });

  const { tag } = await params;
  const hashtag = tag.toLowerCase().replace(/^#/, "");

  const existing = await prisma.hashtagFollow.findUnique({
    where: { userId_hashtag: { userId: session.userId, hashtag } },
  });

  return NextResponse.json({ following: !!existing });
}

// POST /api/hashtags/[tag]/follow — toggle follow
export async function POST(_req: NextRequest, { params }: { params: Promise<{ tag: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tag } = await params;
  const hashtag = tag.toLowerCase().replace(/^#/, "");

  const existing = await prisma.hashtagFollow.findUnique({
    where: { userId_hashtag: { userId: session.userId, hashtag } },
  });

  if (existing) {
    await prisma.hashtagFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    await prisma.hashtagFollow.create({ data: { hashtag, userId: session.userId } });
    return NextResponse.json({ following: true });
  }
}
