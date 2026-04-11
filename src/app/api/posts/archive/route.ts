import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET archived posts
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const posts = await prisma.post.findMany({
    where: { userId: session.userId, archived: true },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts.map(p => ({
    ...p,
    images: JSON.parse(p.images || "[]"),
  })));
}

// POST toggle archive
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await req.json();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { archived: !post.archived },
  });

  return NextResponse.json({ archived: updated.archived });
}
