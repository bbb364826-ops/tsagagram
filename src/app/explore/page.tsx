"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Post { id: string; images: string[]; _count: { likes: number; comments: number } }
interface TrendingTag { tag: string; count: number }

type ExploreTab = "posts" | "reels" | "tags";

export default function Explore() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [exploreTab, setExploreTab] = useState<ExploreTab>("posts");

  useEffect(() => {
    fetch("/api/posts/foryou?limit=30&offset=0")
      .then(r => r.ok ? r.json() : [])
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .finally(() => setPostsLoading(false));
    fetch("/api/hashtags/trending").then(r => r.ok ? r.json() : []).then(setTrendingTags);
  }, []);

  return (
    <div style={{ background: "var(--card)" }}>
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 sticky top-14 z-10" style={{ background: "var(--card)" }}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <div className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm cursor-pointer"
            style={{ background: "var(--gray-light)", color: "var(--gray-mid)" }}
            onClick={() => router.push("/search")}>
            ძიება
          </div>
        </div>
      </div>

      {/* Explore tabs */}
      <div className="flex border-b mb-0.5" style={{ borderColor: "var(--border)" }}>
        {(["posts", "reels", "tags"] as ExploreTab[]).map(t => (
          <button key={t} onClick={() => setExploreTab(t)}
            className="flex-1 py-2.5 text-xs font-semibold capitalize"
            style={{ color: exploreTab === t ? "var(--navy)" : "var(--gray-mid)", borderBottom: exploreTab === t ? "2px solid var(--navy)" : "2px solid transparent" }}>
            {t === "posts" ? "პოსტები" : t === "reels" ? "Reels" : "#ტეგები"}
          </button>
        ))}
      </div>

      {exploreTab === "tags" ? (
        <div className="px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--gray-mid)" }}>Trending ჰეშთეგები</p>
          {trendingTags.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--gray-mid)" }}>
              <p className="text-3xl mb-2">🏷️</p>
              <p className="text-sm">ჯერ ჰეშთეგი არ არის</p>
            </div>
          ) : trendingTags.map((t, i) => (
            <Link key={t.tag} href={`/hashtag/${t.tag}`}
              className="flex items-center gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                #
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>#{t.tag}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{t.count} პოსტი</p>
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--gray-mid)" }}>#{i + 1}</span>
            </Link>
          ))}
        </div>
      ) : exploreTab === "reels" ? (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.filter(p => p.images[0]?.match(/\.(mp4|webm|mov)/i)).map(p => (
            <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block bg-black">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Posts grid */
        postsLoading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--gray-light)" }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--gray-mid)" }}>
            <p className="text-4xl mb-3">📷</p>
            <p className="text-sm font-medium">პოსტები არ არის</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((p, i) => {
              const isLarge = i === 0 || (i > 0 && i % 7 === 0);
              const src = p.images?.[0];
              const isVideo = src?.match(/\.(mp4|webm|mov)$/i);
              return (
                <Link key={p.id} href={`/p/${p.id}`}
                  className={`relative aspect-square block overflow-hidden group ${isLarge ? "col-span-2 row-span-2" : ""}`}>
                  {src ? (
                    isVideo ? (
                      <video src={src} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <Image src={src} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" sizes="33vw" unoptimized />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: "var(--gray-light)" }}>📷</div>
                  )}
                  <div className="absolute inset-0 opacity-0 group-active:opacity-100 flex items-center justify-center gap-3 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.35)" }}>
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      {p._count.likes}
                    </span>
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      {p._count.comments}
                    </span>
                  </div>
                  {isVideo && (
                    <div className="absolute top-2 right-2">
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  )}
                  {p.images?.length > 1 && !isVideo && (
                    <div className="absolute top-2 right-2">
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
