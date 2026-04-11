"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Post { id: string; images: string[]; _count: { likes: number; comments: number } }

const PAGE_SIZE = 30;

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const offset = useRef(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/posts?tag=${encodeURIComponent(tag)}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
      if (res.ok) {
        const data: Post[] = await res.json();
        if (reset) {
          setPosts(data);
          setTotalCount(data.length);
          offset.current = data.length;
        } else {
          setPosts(prev => [...prev, ...data]);
          setTotalCount(prev => prev + data.length);
          offset.current += data.length;
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }, [tag]);

  useEffect(() => {
    offset.current = 0;
    setHasMore(true);
    loadPosts(true);
    fetch("/api/hashtags/follow").then(r => r.ok ? r.json() : []).then((tags: string[]) => {
      setFollowing(tags.includes(tag.toLowerCase()));
    });
  }, [tag, loadPosts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadPosts(false);
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, loadPosts]);

  const toggleFollow = async () => {
    setToggling(true);
    const res = await fetch("/api/hashtags/follow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtag: tag }),
    });
    if (res.ok) { const d = await res.json(); setFollowing(d.following); }
    setToggling(false);
  };

  return (
    <div style={{ background: "var(--card)" }}>
      <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-2xl font-bold" style={{ color: "var(--navy)" }}>#{tag}</p>
          <button onClick={toggleFollow} disabled={toggling}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: following ? "transparent" : "var(--navy)",
              color: following ? "var(--navy)" : "white",
              border: following ? "1.5px solid var(--navy)" : "none",
            }}>
            {toggling ? "..." : following ? "მიყვები ✓" : "მიყოლა"}
          </button>
        </div>
        <p className="text-sm" style={{ color: "var(--gray-mid)" }}>{totalCount}+ პოსტი</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--gray-light)" }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold" style={{ color: "var(--navy)" }}>პოსტი ჯერ არ არის</p>
          <p className="text-sm mt-1" style={{ color: "var(--gray-mid)" }}>პირველი გამოიყენე #{tag}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(p => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block group">
                {p.images[0]?.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={p.images[0]} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                ) : p.images[0] ? (
                  <Image src={p.images[0]} alt="" fill className="object-cover" sizes="33vw" unoptimized />
                ) : (
                  <div className="w-full h-full" style={{ background: "var(--gray-light)" }} />
                )}
                <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center gap-3"
                  style={{ background: "rgba(0,0,0,0.4)" }}>
                  <span className="text-white text-xs font-bold">❤️ {p._count.likes}</span>
                  <span className="text-white text-xs font-bold">💬 {p._count.comments}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>სულ {totalCount} პოსტი</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
