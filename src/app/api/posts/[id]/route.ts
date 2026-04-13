import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      likes: session ? { where: { userId: session.userId }, select: { userId: true } } : false,
      saves: session ? { where: { userId: session.userId } } : false,
      productTags: true,
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, username: true, avatar: true, verified: true } },
          likes: session ? { where: { userId: session.userId }, select: { userId: true } } : false,
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Track view (fire-and-forget, don't block response)
  prisma.postView.create({ data: { postId: id, userId: session?.userId || null } }).catch(() => {});

  let collabUser = null;
  if (post.collabUserId) {
    collabUser = await prisma.user.findUnique({
      where: { id: post.collabUserId },
      select: { username: true, avatar: true, verified: true },
    });
  }

  return NextResponse.json({
    ...post,
    images: JSON.parse(post.images || "[]"),
    hashtags: (() => { try { const h = JSON.parse(post.hashtags || "[]"); return Array.isArray(h) ? h : []; } catch { return post.hashtags?.match(/#[\w\u10D0-\u10FF]+/g) || []; } })(),
    isLiked: session ? (post.likes as { userId: string }[]).length > 0 : false,
    isSaved: session ? (post.saves as { id: string }[]).length > 0 : false,
    collabUser,
    collabAccepted: post.collabAccepted,
    pinnedCommentId: post.pinnedCommentId || null,
    comments: post.comments.map(c => ({
      ...c,
      isLiked: session ? (c.likes as { userId: string }[] | false) !== false && (c.likes as { userId: string }[]).length > 0 : false,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { caption, location, archived, hideLikes, disableComments } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (caption !== undefined) {
    updateData.caption = caption;
    updateData.location = location;
    updateData.hashtags = JSON.stringify([...new Set((caption || "").match(/#[\w\u10D0-\u10FF]+/g) || [])]);
  }
  if (archived !== undefined) updateData.archived = archived;
  if (hideLikes !== undefined) updateData.hideLikes = hideLikes;
  if (disableComments !== undefined) updateData.disableComments = disableComments;

  const updated = await prisma.post.update({
    where: { id },
    data: updateData,
  });

  const hashtags = (() => { try { const h = JSON.parse(updated.hashtags || "[]"); return Array.isArray(h) ? h : []; } catch { return []; } })();
  return NextResponse.json({ ...updated, images: JSON.parse(updated.images), hashtags });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
