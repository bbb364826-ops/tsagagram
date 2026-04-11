import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const collections = await prisma.saveCollection.findMany({
    where: { userId: session.userId },
    include: {
      saves: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { post: { select: { images: true } } },
      },
      _count: { select: { saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(collections.map(c => ({
    ...c,
    cover: c.saves[0]
      ? (() => { try { return JSON.parse((c.saves[0].post as { images: string }).images)[0]; } catch { return null; } })()
      : null,
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const col = await prisma.saveCollection.create({
    data: { name: name.trim(), userId: session.userId },
  });

  return NextResponse.json(col, { status: 201 });
}
