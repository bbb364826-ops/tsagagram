import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { name: { contains: q } },
      ],
    },
    select: { id: true, username: true, name: true, avatar: true, _count: { select: { followers: true } } },
    take: Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 20),
  });

  return NextResponse.json(users);
}
