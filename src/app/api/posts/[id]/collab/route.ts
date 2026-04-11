import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Accept or decline a collab invite
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { action } = await req.json(); // "accept" | "decline"

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.collabUserId !== session.userId) return NextResponse.json({ error: "Not invited" }, { status: 403 });

  if (action === "accept") {
    await prisma.post.update({ where: { id: postId }, data: { collabAccepted: true } });
    // Notify the post owner
    await prisma.notification.create({
      data: { type: "collab_accept", receiverId: post.userId, senderId: session.userId, postId },
    }).catch(() => {});
    return NextResponse.json({ ok: true, accepted: true });
  } else {
    // Decline: remove the collab association
    await prisma.post.update({ where: { id: postId }, data: { collabUserId: null, collabAccepted: false } });
    return NextResponse.json({ ok: true, accepted: false });
  }
}
