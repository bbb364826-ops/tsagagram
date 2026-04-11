import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json(null);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, name: true, avatar: true, bio: true, website: true,
        isPrivate: true, verified: true, totpEnabled: true,
        _count: { select: { posts: true, followers: true, following: true } } },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("[ME ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
