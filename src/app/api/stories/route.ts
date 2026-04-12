import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  const cutoff = new Date();
  // Clean up expired stories
  prisma.story.deleteMany({ where: { expiresAt: { lte: cutoff } } }).catch(() => {});
  const following = session
    ? await prisma.follow.findMany({ where: { followerId: session.userId }, select: { followingId: true } })
    : [];
  const ids = session ? [session.userId, ...following.map(f => f.followingId)] : [];

  // Get close friends list for filtering
  const closeFriendIds = session
    ? (await prisma.closeFriend.findMany({ where: { ownerId: { in: ids }, friendId: session.userId }, select: { ownerId: true } })).map(f => f.ownerId)
    : [];

  const users = await prisma.user.findMany({
    where: ids.length ? { id: { in: ids } } : {},
    select: {
      id: true, username: true, avatar: true,
      stories: {
        where: { expiresAt: { gt: cutoff } },
        orderBy: { createdAt: "desc" },
        select: { id: true, media: true, mediaType: true, caption: true, createdAt: true, forClose: true, stickers: true },
      },
    },
  });

  // Filter out close-friends-only stories for non-close-friends
  const filtered = users.map(u => ({
    ...u,
    stories: u.stories.filter(s =>
      !s.forClose || u.id === session?.userId || closeFriendIds.includes(u.id)
    ),
  })).filter(u => u.stories.length > 0);

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { media, mediaType, caption, forClose, stickers } = await req.json();
  if (!media) return NextResponse.json({ error: "Media required" }, { status: 400 });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: {
      media,
      mediaType: mediaType || "image",
      caption,
      forClose: forClose || false,
      stickers: stickers || null,
      expiresAt,
      userId: session.userId,
    },
  });

  return NextResponse.json(story, { status: 201 });
}
