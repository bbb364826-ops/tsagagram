import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const follows = await prisma.follow.findMany({
    where: { followingId: user.id },
    include: {
      follower: {
        select: { id: true, username: true, name: true, avatar: true, verified: true,
          _count: { select: { followers: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const myFollowingIds = session
    ? (await prisma.follow.findMany({ where: { followerId: session.userId }, select: { followingId: true } })).map(f => f.followingId)
    : [];

  return NextResponse.json(follows.map(f => ({
    ...f.follower,
    isFollowing: myFollowingIds.includes(f.follower.id),
    isMe: session?.userId === f.follower.id,
  })));
}
