import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    const { email, password, totpToken } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "მომხმარებელი ვერ მოიძებნა" }, { status: 404 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "პაროლი არასწორია" }, { status: 401 });
    }

    // 2FA check
    if (user.totpEnabled && user.totpSecret) {
      if (!totpToken) {
        return NextResponse.json({ requireTotp: true }, { status: 200 });
      }
      if (!verifyTOTP(user.totpSecret, totpToken)) {
        return NextResponse.json({ error: "2FA კოდი არასწორია" }, { status: 401 });
      }
    }

    const token = signToken({ userId: user.id, username: user.username });

    // Record session (non-blocking)
    const ua = req.headers.get("user-agent") || "Unknown";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "Unknown";
    const device = ua.includes("Mobile") ? "Mobile" : ua.includes("Tablet") ? "Tablet" : "Desktop";
    prisma.session.create({ data: { token, device, ip, userId: user.id } }).catch(() => {});

    const res = NextResponse.json({ user: { id: user.id, username: user.username, name: user.name, avatar: user.avatar } });
    res.cookies.set("token", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
