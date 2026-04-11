import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const saves = await prisma.save.findMany({
    where: { userId: session.userId },
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
    collectionId: s.collectionId,
  })));
}
