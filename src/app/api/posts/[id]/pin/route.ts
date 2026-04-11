import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!post.pinned) {
    // Unpin all others first
    await prisma.post.updateMany({
      where: { userId: session.userId, pinned: true },
      data: { pinned: false },
    });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { pinned: !post.pinned },
  });

  return NextResponse.json({ pinned: updated.pinned });
}
