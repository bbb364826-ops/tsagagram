import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/hashtags/follow → list followed hashtags
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const follows = await prisma.hashtagFollow.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(follows.map(f => f.hashtag));
}

// POST /api/hashtags/follow { hashtag }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hashtag } = await req.json();
  if (!hashtag) return NextResponse.json({ error: "Missing hashtag" }, { status: 400 });

  const tag = hashtag.replace(/^#/, "").toLowerCase();
  const existing = await prisma.hashtagFollow.findUnique({
    where: { userId_hashtag: { userId: session.userId, hashtag: tag } },
  });

  if (existing) {
    await prisma.hashtagFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    await prisma.hashtagFollow.create({ data: { userId: session.userId, hashtag: tag } });
    return NextResponse.json({ following: true });
  }
}
