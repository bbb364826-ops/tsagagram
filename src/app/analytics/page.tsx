"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface PostStats {
  id: string; images: string[]; caption?: string; createdAt: string;
  _count: { likes: number; comments: number; saves: number; views: number };
}
interface AnalyticsData {
  posts: PostStats[]; totalFollowers: number; totalLikes: number; totalViews: number; totalComments: number;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      fetch("/api/analytics").then(r => r.json()).then(d => setData(d));
    }
  }, [user, loading, router]);

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  const engagementRate = data.totalFollowers > 0
    ? (((data.totalLikes + data.totalComments) / Math.max(1, data.posts.length) / data.totalFollowers) * 100).toFixed(1)
    : "0.0";

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Insights</h1>
        <p className="text-sm" style={{ color: "var(--gray-mid)" }}>Your account performance</p>
      </div>

      {/* Summary cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Followers", value: data.totalFollowers, icon: "👥" },
          { label: "Total Views", value: data.totalViews, icon: "👁" },
          { label: "Total Likes", value: data.totalLikes, icon: "❤️" },
          { label: "Engagement", value: `${engagementRate}%`, icon: "📈" },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold" style={{ color: "var(--navy)" }}>{stat.value}</div>
            <div className="text-xs" style={{ color: "var(--gray-mid)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Top posts */}
      <div className="px-4">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy)" }}>Post Performance</p>
        <div className="space-y-3 pb-24">
          {data.posts.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>No posts yet</p>
            </div>
          ) : data.posts.map(post => (
            <div key={post.id} className="rounded-2xl overflow-hidden flex gap-3 p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                <Image src={post.images[0]} alt="" fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                {post.caption && <p className="text-sm truncate mb-2" style={{ color: "var(--navy)" }}>{post.caption}</p>}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { icon: "❤️", val: post._count.likes },
                    { icon: "💬", val: post._count.comments },
                    { icon: "🔖", val: post._count.saves },
                    { icon: "👁", val: post._count.views },
                  ].map(s => (
                    <div key={s.icon} className="text-center">
                      <div className="text-xs">{s.icon}</div>
                      <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
