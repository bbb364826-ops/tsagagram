import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId, commentId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, pinnedCommentId: true } });
  if (!post || post.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Toggle pin: if already pinned with same comment, unpin
  const newPinnedId = post.pinnedCommentId === commentId ? null : commentId;

  await prisma.post.update({
    where: { id: postId },
    data: { pinnedCommentId: newPinnedId },
  });

  return NextResponse.json({ pinned: !!newPinnedId, commentId: newPinnedId });
}
