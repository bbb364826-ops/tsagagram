import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await getSession();
  const { id } = await params;

  const likes = await prisma.like.findMany({
    where: { postId: id },
    include: { user: { select: { id: true, username: true, avatar: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(likes.map(l => l.user));
}
