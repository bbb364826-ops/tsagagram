import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const type = req.nextUrl.searchParams.get("type") || "all"; // all | users | hashtags | posts

  if (!q) return NextResponse.json({ users: [], hashtags: [], posts: [] });

  const blockedIds = session
    ? (await prisma.block.findMany({
        where: { OR: [{ blockerId: session.userId }, { blockedId: session.userId }] },
        select: { blockerId: true, blockedId: true },
      })).flatMap(b => [b.blockerId, b.blockedId]).filter(id => id !== session.userId)
    : [];

  const [users, posts] = await Promise.all([
    (type === "all" || type === "users") ? prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: blockedIds } },
          { OR: [{ username: { contains: q } }, { name: { contains: q } }] },
        ],
      },
      select: {
        id: true, username: true, name: true, avatar: true, verified: true,
        _count: { select: { followers: true } },
        followers: session ? { where: { followerId: session.userId }, select: { id: true } } : false,
      },
      take: 20,
    }) : [],
    (type === "all" || type === "posts") ? prisma.post.findMany({
      where: {
        AND: [
          { archived: false },
          { user: { isPrivate: false, id: { notIn: blockedIds } } },
          { OR: [{ caption: { contains: q } }, { hashtags: { contains: q } }] },
        ],
      },
      select: {
        id: true, images: true, _count: { select: { likes: true, comments: true } },
      },
      take: 20,
      orderBy: { likes: { _count: "desc" } },
    }) : [],
  ]);

  // Extract hashtags from posts hashtag fields
  const hashtagMap = new Map<string, number>();
  if (type === "all" || type === "hashtags") {
    const hashtagPosts = await prisma.post.findMany({
      where: { archived: false, hashtags: { contains: q.replace(/^#/, "") } },
      select: { hashtags: true },
      take: 50,
    });
    for (const p of hashtagPosts) {
      const tags: string[] = (() => { try { return JSON.parse(p.hashtags || "[]"); } catch { return []; } })();
      tags.filter(t => t.toLowerCase().includes(q.replace(/^#/, "").toLowerCase())).forEach(t => {
        hashtagMap.set(t, (hashtagMap.get(t) || 0) + 1);
      });
    }
  }

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      isFollowing: session ? (u.followers as { id: string }[] || []).length > 0 : false,
    })),
    hashtags: [...hashtagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([tag, count]) => ({ tag, count })),
    posts: posts.map(p => ({
      ...p,
      images: (() => { try { return JSON.parse((p as { images: string }).images); } catch { return []; } })(),
    })),
  });
}
