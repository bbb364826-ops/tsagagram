import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const { id } = await params;

  const saves = await prisma.save.findMany({
    where: { userId: session.userId, collectionId: id },
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const col = await prisma.saveCollection.findUnique({ where: { id } });
  if (!col || col.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.saveCollection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json();
  const col = await prisma.saveCollection.findUnique({ where: { id } });
  if (!col || col.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.saveCollection.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
}
