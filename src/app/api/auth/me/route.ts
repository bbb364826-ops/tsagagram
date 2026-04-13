import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "პაროლი სავალდებულოა" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { password: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "პაროლი არასწორია" }, { status: 403 });

  // Cascade delete — Prisma schema has onDelete: Cascade on most relations
  await prisma.user.delete({ where: { id: session.userId } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}

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
