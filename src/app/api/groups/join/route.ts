import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await req.json();
  const existing = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: session.userId, groupId } } });

  if (existing) {
    await prisma.groupMember.delete({ where: { userId_groupId: { userId: session.userId, groupId } } });
    return NextResponse.json({ joined: false });
  } else {
    await prisma.groupMember.create({ data: { userId: session.userId, groupId, role: "member" } });
    return NextResponse.json({ joined: true });
  }
}
