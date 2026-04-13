import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get posts from last 7 days, extract hashtags, count occurrences
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: { hashtags: { not: null }, createdAt: { gte: cutoff } },
    select: { hashtags: true },
    take: 500,
  });

  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (!p.hashtags) continue;
    let tags: string[];
    try {
      const parsed = JSON.parse(p.hashtags);
      tags = Array.isArray(parsed) ? parsed.map((t: string) => t.replace(/^#/, "").toLowerCase()) : [];
    } catch {
      tags = p.hashtags.split(/[\s,]+/).filter(t => t.startsWith("#")).map(t => t.slice(1).toLowerCase());
    }
    for (const t of tags) { if (t) counts[t] = (counts[t] || 0) + 1; }
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json(sorted);
}
