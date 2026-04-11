import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, name: true, bio: true, avatar: true, website: true, createdAt: true,
      isPrivate: true, lastSeen: true, verified: true, pronouns: true,
      _count: { select: { posts: true, followers: true, following: true } },
      posts: {
        orderBy: { createdAt: "desc" },
        select: { id: true, images: true, _count: { select: { likes: true, comments: true } } },
      },
      followers: session ? { where: { followerId: session.userId }, select: { id: true } } : false,
    },
  });

  if (!user) return NextResponse.json({ error: "მომხმარებელი ვერ მოიძებნა" }, { status: 404 });

  const isOwnProfile = session?.userId === user.id;
  const isFollowing = session ? (user.followers as { id: string }[]).length > 0 : false;
  const canViewPosts = !user.isPrivate || isOwnProfile || isFollowing;

  const [blockStatus, muteStatus, followRequest, reverseFollow, blockedByTarget] = session && !isOwnProfile
    ? await Promise.all([
        prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: session.userId, blockedId: user.id } } }),
        prisma.mute.findUnique({ where: { muterId_mutedId: { muterId: session.userId, mutedId: user.id } } }),
        prisma.followRequest.findUnique({ where: { fromId_toId: { fromId: session.userId, toId: user.id } } }),
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: session.userId } } }),
        prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: session.userId } } }),
      ])
    : [null, null, null, null, null];

  // If blocked by target, return minimal profile with no posts
  if (blockedByTarget) {
    return NextResponse.json({
      id: user.id, username: user.username, name: user.name, avatar: user.avatar,
      isOwnProfile: false, isFollowing: false, isPrivate: true, isLocked: true,
      isBlocked: false, blockedByTarget: true, posts: [],
      _count: { posts: 0, followers: 0, following: 0 },
    });
  }

  // Update lastSeen for own profile
  if (isOwnProfile && session) {
    prisma.user.update({ where: { id: session.userId }, data: { lastSeen: new Date() } }).catch(() => {});
  }

  return NextResponse.json({
    ...user,
    posts: canViewPosts ? user.posts : [],
    isFollowing,
    isOwnProfile,
    isPrivate: user.isPrivate,
    isLocked: user.isPrivate && !isOwnProfile && !isFollowing,
    isBlocked: !!blockStatus,
    isMuted: !!muteStatus,
    mutePosts: muteStatus?.mutePosts ?? false,
    muteStories: muteStatus?.muteStories ?? false,
    hasRequestedFollow: !!followRequest,
    followsYou: !!reverseFollow,
    lastSeen: user.lastSeen,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.id !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, bio, website, avatar, isPrivate, pronouns } = await req.json();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, bio, website, avatar, ...(isPrivate !== undefined && { isPrivate }), ...(pronouns !== undefined && { pronouns }) },
    select: { id: true, username: true, name: true, bio: true, avatar: true, website: true, isPrivate: true, pronouns: true },
  });

  return NextResponse.json(updated);
}
