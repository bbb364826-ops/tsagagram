import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json([]);

  const posts = await prisma.groupPost.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, username: true, avatar: true, verified: true } } },
  });

  return NextResponse.json(posts.map(p => ({ ...p, images: JSON.parse(p.images) })));
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, images, caption } = await req.json();
  if (!groupId || !images?.length) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: session.userId, groupId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const post = await prisma.groupPost.create({
    data: { groupId, userId: session.userId, images: JSON.stringify(images), caption },
    include: { user: { select: { id: true, username: true, avatar: true, verified: true } } },
  });

  return NextResponse.json({ ...post, images });
}
