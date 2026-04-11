import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Share a post to one or more DM conversations
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { recipientIds } = await req.json();
  if (!recipientIds?.length) return NextResponse.json({ error: "Recipients required" }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, images: true, caption: true, user: { select: { username: true } } },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const firstImage = (() => { try { return JSON.parse(post.images)[0]; } catch { return null; } })();
  const shareText = `📷 ${post.user.username}-ის პოსტი: ${typeof window === "undefined" ? "" : window.location.origin}/p/${postId}`;

  const messages = await Promise.all(
    recipientIds.map((receiverId: string) =>
      prisma.message.create({
        data: {
          text: shareText,
          mediaUrl: firstImage || null,
          senderId: session.userId,
          receiverId,
        },
      })
    )
  );

  return NextResponse.json({ sent: messages.length });
}
