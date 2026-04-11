import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 });

  const count = await prisma.notification.count({
    where: { receiverId: session.userId, read: false },
  });

  return NextResponse.json({ count });
}
