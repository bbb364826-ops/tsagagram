import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
  const tag = req.nextUrl.searchParams.get("tag");

  let whereClause: Record<string, unknown> = {
    archived: false,
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };

  if (tag) {
    whereClause.hashtags = { contains: tag };
  } else if (session) {
    const following = await prisma.follow.findMany({
      where: { followerId: session.userId },
      select: { followingId: true },
    });
    const ids = [session.userId, ...following.map(f => f.followingId)];
    whereClause.userId = { in: ids };
    // Exclude private accounts the user doesn't follow (already covered by ids filter above)
  } else {
    // Logged-out: only show posts from public accounts
    whereClause.user = { isPrivate: false };
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      // Only fetch current user's like — not all likes (huge perf win)
      likes: session ? { where: { userId: session.userId }, select: { id: true } } : false,
      saves: session ? { where: { userId: session.userId }, select: { id: true } } : false,
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
  });

  const parseHashtags = (h: string | null) => {
    if (!h) return [];
    try { const parsed = JSON.parse(h); return Array.isArray(parsed) ? parsed : []; }
    catch { return h.match(/#[\w\u10D0-\u10FF]+/g) || []; }
  };

  const res = NextResponse.json(posts.map(p => ({
    ...p,
    images: JSON.parse(p.images || "[]"),
    hashtags: parseHashtags(p.hashtags),
    isLiked: session ? (p.likes as { id: string }[]).length > 0 : false,
    isSaved: session ? (p.saves as { id: string }[]).length > 0 : false,
  })));

  // Cache public/hashtag feeds for 30s; user feeds are private so no-store
  if (!session || tag) {
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  } else {
    res.headers.set("Cache-Control", "private, max-age=0");
  }
  return res;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { images, caption, location, altText, filter, disableComments, hideLikes, collabUserId, paidPartnership, scheduledAt, productTags } = await req.json();
  if (!images?.length) return NextResponse.json({ error: "Image required" }, { status: 400 });

  const hashtags = [...new Set((caption || "").match(/#[\w\u10D0-\u10FF]+/g) || [])];

  const post = await prisma.post.create({
    data: {
      images: JSON.stringify(images),
      caption,
      location,
      altText: altText || undefined,
      hashtags: JSON.stringify(hashtags),
      filter: filter || undefined,
      disableComments: disableComments || false,
      hideLikes: hideLikes || false,
      collabUserId: collabUserId || undefined,
      paidPartnership: paidPartnership || false,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      userId: session.userId,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  // Send collab invite notification
  if (collabUserId) {
    await prisma.notification.create({
      data: { type: "collab_invite", receiverId: collabUserId, senderId: session.userId, postId: post.id },
    }).catch(() => {});
  }

  if (productTags?.length) {
    await prisma.productTag.createMany({
      data: productTags.map((t: { name: string; price: number; currency: string; url?: string; x: number; y: number }) => ({
        name: t.name,
        price: Number(t.price),
        currency: t.currency || "GEL",
        url: t.url || null,
        x: t.x,
        y: t.y,
        postId: post.id,
        userId: session.userId,
      })),
    });
  }

  return NextResponse.json({ ...post, images, hashtags }, { status: 201 });
}
