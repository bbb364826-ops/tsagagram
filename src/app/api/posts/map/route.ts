import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { archived: false, lat: { not: null }, lng: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, images: true, caption: true, lat: true, lng: true,
      user: { select: { username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json(posts.map(p => ({ ...p, images: JSON.parse(p.images) })));
}
