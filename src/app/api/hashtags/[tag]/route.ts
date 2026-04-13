import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/hashtags/[tag] — posts containing this hashtag
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const session = await getSession();

  // Hashtags are stored as JSON arrays like ["#tag1","#tag2"]
  const tagLower = tag.toLowerCase().replace(/^#/, "");

  const posts = await prisma.post.findMany({
    where: {
      archived: false,
      hashtags: { contains: tagLower },
    },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      likes: session ? { where: { userId: session.userId }, select: { userId: true } } : false,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    posts.map(p => ({
      ...p,
      images: (() => { try { return JSON.parse(p.images as string); } catch { return [p.images]; } })(),
      isLiked: session ? (p.likes as Array<{ userId: string }>).some(l => l.userId === session.userId) : false,
    }))
  );
}
