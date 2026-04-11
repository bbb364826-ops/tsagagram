import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json([], { status: 404 });

  // Find posts where this user is mentioned in caption with @username
  const posts = await prisma.post.findMany({
    where: {
      archived: false,
      caption: { contains: `@${username}` },
    },
    select: {
      id: true, images: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(posts.map(p => ({
    ...p,
    images: (() => { try { return JSON.parse(p.images); } catch { return []; } })(),
  })));
}
