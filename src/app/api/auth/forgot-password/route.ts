import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// In-memory code store (dev-only, no email service needed)
const resetCodes = new Map<string, { code: string; expires: number }>();

// POST: request reset code
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  // Always return success to prevent email enumeration
  const code = String(Math.floor(100000 + Math.random() * 900000));
  if (user) {
    resetCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
  }
  // In dev mode, return the code directly (no email service)
  return NextResponse.json({ ok: true, _devCode: user ? code : undefined });
}

// PUT: verify code + set new password
export async function PUT(req: NextRequest) {
  const { email, code, newPassword } = await req.json();
  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "პაროლი მინიმუმ 6 სიმბოლო" }, { status: 400 });
  }

  const entry = resetCodes.get(email);
  if (!entry || entry.expires < Date.now() || entry.code !== code) {
    return NextResponse.json({ error: "კოდი არასწორია ან ვადა გასულია" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hashed } });
  resetCodes.delete(email);
  return NextResponse.json({ ok: true });
}
