import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, email, password, name } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: "ყველა ველი სავალდებულოა" }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) {
    return NextResponse.json({ error: "მომხმარებელი უკვე არსებობს" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hashed, name },
  });

  const token = signToken({ userId: user.id, username: user.username });

  const res = NextResponse.json({ user: { id: user.id, username: user.username, name: user.name } });
  res.cookies.set("token", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  return res;
}
