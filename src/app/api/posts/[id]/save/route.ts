import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const body = await req.json().catch(() => ({}));
  const collectionId = body?.collectionId || null;

  const existing = await prisma.save.findUnique({
    where: { userId_postId: { userId: session.userId, postId } },
  });

  if (existing) {
    // If same collection (or both null), unsave. If different collection, move.
    if (existing.collectionId === collectionId) {
      await prisma.save.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false });
    } else {
      await prisma.save.update({ where: { id: existing.id }, data: { collectionId } });
      return NextResponse.json({ saved: true, collectionId });
    }
  }

  await prisma.save.create({ data: { userId: session.userId, postId, collectionId } });
  return NextResponse.json({ saved: true, collectionId });
}

// GET: list saved posts (optionally filtered by collectionId)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const collectionId = req.nextUrl.searchParams.get("collectionId");

  const saves = await prisma.save.findMany({
    where: { userId: session.userId, ...(collectionId ? { collectionId } : {}) },
    include: {
      post: {
        select: { id: true, images: true, _count: { select: { likes: true, comments: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(saves.map(s => ({
    ...s.post,
    images: (() => { try { return JSON.parse((s.post as { images: string }).images); } catch { return []; } })(),
  })));
}
