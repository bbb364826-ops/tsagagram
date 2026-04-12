import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = parseInt(searchParams.get("limit") || "6");

  if (!session) {
    // Not logged in: show popular posts
    const posts = await prisma.post.findMany({
      where: { archived: false },
      orderBy: { likes: { _count: "desc" } },
      skip: offset,
      take: limit,
      select: {
        id: true, images: true, caption: true, location: true, createdAt: true,
        user: { select: { id: true, username: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return NextResponse.json(posts.map(p => ({ ...p, images: JSON.parse(p.images), isLiked: false, isSaved: false })));
  }

  // Get user's liked post hashtags & followed users
  const [likedPosts, savedPosts, following, blocked] = await Promise.all([
    prisma.like.findMany({ where: { userId: session.userId }, select: { postId: true }, take: 50 }),
    prisma.save.findMany({ where: { userId: session.userId }, select: { postId: true }, take: 50 }),
    prisma.follow.findMany({ where: { followerId: session.userId }, select: { followingId: true } }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: session.userId }, { blockedId: session.userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const blockedIds = blocked.flatMap(b => [b.blockerId, b.blockedId]).filter(id => id !== session.userId);
  const followingIds = following.map(f => f.followingId).filter(id => !blockedIds.includes(id));
  const likedPostIds = likedPosts.map(l => l.postId);
  const savedPostIds = savedPosts.map(s => s.postId);

  // Fetch candidate posts (mix: followed + popular + recent)
  const [followedPosts, popularPosts, recentPosts] = await Promise.all([
    followingIds.length > 0 ? prisma.post.findMany({
      where: { userId: { in: followingIds }, archived: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, images: true, caption: true, location: true, createdAt: true, userId: true,
        user: { select: { id: true, username: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true, views: true } },
        likes: { where: { userId: session.userId }, select: { id: true } },
        saves: { where: { userId: session.userId }, select: { id: true } },
      },
    }) : [],
    prisma.post.findMany({
      where: { archived: false, userId: { not: session.userId, notIn: blockedIds } },
      orderBy: { likes: { _count: "desc" } },
      take: 20,
      select: { id: true, images: true, caption: true, location: true, createdAt: true, userId: true,
        user: { select: { id: true, username: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true, views: true } },
        likes: { where: { userId: session.userId }, select: { id: true } },
        saves: { where: { userId: session.userId }, select: { id: true } },
      },
    }),
    prisma.post.findMany({
      where: { archived: false, userId: { not: session.userId, notIn: blockedIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, images: true, caption: true, location: true, createdAt: true, userId: true,
        user: { select: { id: true, username: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true, views: true } },
        likes: { where: { userId: session.userId }, select: { id: true } },
        saves: { where: { userId: session.userId }, select: { id: true } },
      },
    }),
  ]);

  // Score each post
  const score = (p: typeof followedPosts[0]) => {
    const isFollowed = followingIds.includes(p.userId);
    const isLiked = likedPostIds.includes(p.id);
    const isSaved = savedPostIds.includes(p.id);
    const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
    const views = (p._count as { likes: number; comments: number; views?: number }).views ?? 0;
    const engagementScore = (p._count.likes * 2 + p._count.comments * 3 + views) / Math.max(1, ageHours);
    return (isFollowed ? 50 : 0) + (isLiked ? 10 : 0) + (isSaved ? 5 : 0) + engagementScore;
  };

  // Deduplicate and sort
  const seen = new Set<string>();
  const all = [...followedPosts, ...popularPosts, ...recentPosts].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  all.sort((a, b) => score(b) - score(a));
  const page = all.slice(offset, offset + limit);

  return NextResponse.json(page.map(p => ({
    ...p,
    images: JSON.parse(p.images),
    isLiked: p.likes.length > 0,
    isSaved: p.saves.length > 0,
  })));
}
