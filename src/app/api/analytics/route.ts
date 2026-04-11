import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (postId) {
    // Single post analytics
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: session.userId },
      include: {
        _count: { select: { likes: true, comments: true, saves: true, views: true } },
        views: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  }

  // All posts analytics
  const posts = await prisma.post.findMany({
    where: { userId: session.userId, archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, images: true, caption: true, createdAt: true,
      _count: { select: { likes: true, comments: true, saves: true, views: true } },
    },
  });

  const totalFollowers = await prisma.follow.count({ where: { followingId: session.userId } });
  const totalLikes = posts.reduce((s, p) => s + p._count.likes, 0);
  const totalViews = posts.reduce((s, p) => s + p._count.views, 0);
  const totalComments = posts.reduce((s, p) => s + p._count.comments, 0);

  return NextResponse.json({ posts: posts.map(p => ({ ...p, images: JSON.parse(p.images) })), totalFollowers, totalLikes, totalViews, totalComments });
}

// Track a view
export async function POST(req: NextRequest) {
  const { postId, userId } = await req.json();
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  await prisma.postView.create({ data: { postId, userId: userId || null } });
  return NextResponse.json({ ok: true });
}
