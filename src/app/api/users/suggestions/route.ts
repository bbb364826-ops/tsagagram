import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json([]);

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  // Get current user's following IDs
  const following = await prisma.follow.findMany({
    where: { followerId: session.userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);
  const excludeIds = [session.userId, ...followingIds];

  // Get blocked/blocker IDs
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: session.userId }, { blockedId: session.userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blocks.flatMap(b => [b.blockerId, b.blockedId]);
  excludeIds.push(...blockedIds);

  // Suggest people followed by people you follow (friends of friends)
  let suggestions: { id: string; username: string; name?: string | null; avatar?: string | null; verified: boolean; _count: { followers: number } }[] = [];

  if (followingIds.length > 0) {
    const friendFollowing = await prisma.follow.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: excludeIds },
      },
      select: { followingId: true },
      take: 50,
    });

    const friendFollowingIds = [...new Set(friendFollowing.map(f => f.followingId))];

    if (friendFollowingIds.length > 0) {
      suggestions = await prisma.user.findMany({
        where: { id: { in: friendFollowingIds }, isPrivate: false },
        select: {
          id: true, username: true, name: true, avatar: true, verified: true,
          _count: { select: { followers: true } },
        },
        take: limit,
      });
    }
  }

  // Fill remaining with popular users
  if (suggestions.length < limit) {
    const popular = await prisma.user.findMany({
      where: { id: { notIn: [...excludeIds, ...suggestions.map(s => s.id)] }, isPrivate: false },
      select: {
        id: true, username: true, name: true, avatar: true, verified: true,
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: "desc" } },
      take: limit - suggestions.length,
    });
    suggestions = [...suggestions, ...popular];
  }

  return NextResponse.json(suggestions);
}
