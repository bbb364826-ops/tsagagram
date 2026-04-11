import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json([]);

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "8");

  const following = await prisma.follow.findMany({
    where: { followerId: session.userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);
  const excludeIds = [session.userId, ...followingIds];

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: session.userId }, { blockedId: session.userId }] },
    select: { blockerId: true, blockedId: true },
  });
  excludeIds.push(...blocks.flatMap(b => [b.blockerId, b.blockedId]));

  // Friends of friends
  let suggestions: { id: string; username: string; name?: string | null; avatar?: string | null; verified: boolean; _count: { followers: number }; reason?: string }[] = [];

  if (followingIds.length > 0) {
    const friendFollowing = await prisma.follow.findMany({
      where: { followerId: { in: followingIds }, followingId: { notIn: excludeIds } },
      select: { followingId: true },
      take: 50,
    });
    const fofIds = [...new Set(friendFollowing.map(f => f.followingId))];
    if (fofIds.length > 0) {
      const fofUsers = await prisma.user.findMany({
        where: { id: { in: fofIds }, isPrivate: false },
        select: { id: true, username: true, name: true, avatar: true, verified: true, _count: { select: { followers: true } } },
        take: limit,
      });
      suggestions = fofUsers.map(u => ({ ...u, reason: "Followed by people you follow" }));
    }
  }

  // Fill with popular
  if (suggestions.length < limit) {
    const popular = await prisma.user.findMany({
      where: { id: { notIn: [...excludeIds, ...suggestions.map(s => s.id)] }, isPrivate: false },
      select: { id: true, username: true, name: true, avatar: true, verified: true, _count: { select: { followers: true } } },
      orderBy: { followers: { _count: "desc" } },
      take: limit - suggestions.length,
    });
    suggestions = [...suggestions, ...popular.map(u => ({ ...u, reason: "Popular on Tsagagram" }))];
  }

  return NextResponse.json(suggestions);
}
