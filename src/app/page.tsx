"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Stories from "@/components/Stories";
import PostCard from "@/components/PostCard";
import AdCard from "@/components/AdCard";
import { PostSkeleton, StorySkeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/useAuth";

interface Post {
  id: string; images: string[]; caption?: string; location?: string; createdAt: string;
  isLiked: boolean; isSaved: boolean;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { likes: number; comments: number };
}
interface SuggestedUser {
  id: string; username: string; name?: string; avatar?: string; verified?: boolean;
  reason?: string;
  _count: { followers: number };
}

const PAGE_SIZE = 6;

export default function Home() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pullY, setPullY] = useState(0);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [feedTab, setFeedTab] = useState<"following" | "foryou">("following");
  const touchStartY = useRef(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const CACHE_KEY = `feed_cache_${feedTab}`;
  const CACHE_TTL = 60 * 1000; // 60 seconds

  const loadPosts = useCallback(async (reset = false) => {
    try {
      const offset = reset ? 0 : page * PAGE_SIZE;
      // Show cached data instantly on reset, then refresh in background
      if (reset) {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL) {
              setPosts(data); setPage(1); setHasMore(data.length === PAGE_SIZE);
              setFetching(false);
            }
          }
        } catch { /* ignore */ }
      }
      const endpoint = feedTab === "foryou" ? `/api/posts/foryou?offset=${offset}&limit=${PAGE_SIZE}` : `/api/posts?offset=${offset}&limit=${PAGE_SIZE}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      if (reset) {
        setPosts(arr); setPage(1);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: arr, ts: Date.now() })); } catch { /* ignore */ }
      } else {
        setPosts(p => [...p, ...arr]); setPage(p => p + 1);
      }
      setHasMore(arr.length === PAGE_SIZE);
    } catch {
      // fail silently
    } finally {
      setFetching(false); setRefreshing(false);
    }
  }, [page, feedTab, CACHE_KEY]);

  const loadSuggested = async () => {
    const res = await fetch("/api/users/suggested");
    if (res.ok) setSuggested(await res.json());
  };

  useEffect(() => { loadPosts(true); loadSuggested(); }, [feedTab]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !fetching) loadPosts();
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, fetching, loadPosts]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, 60));
  };
  const handleTouchEnd = () => {
    if (pullY > 40) { setRefreshing(true); loadPosts(true); }
    setPullY(0);
  };

  const handleFollow = async (userId: string) => {
    setFollowing(f => ({ ...f, [userId]: !f[userId] }));
    await fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: userId }) });
  };

  if (loading || (fetching && posts.length === 0)) {
    return (
      <div className="max-w-lg mx-auto" style={{ background: "var(--card)" }}>
        <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}><StorySkeleton /></div>
        {[1,2,3].map(i => <PostSkeleton key={i} />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-xl">
          <Image src="/logo.png" alt="Tsagagram" width={96} height={96} className="object-contain w-full h-full" />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>Tsagagram</h2>
        <p className="text-sm mb-8" style={{ color: "var(--gray-mid)" }}>Visual Storytelling Platform</p>
        <Link href="/login" className="w-full max-w-xs py-3 rounded-xl font-semibold text-white text-center block mb-3"
          style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>Log in</Link>
        <Link href="/register" className="w-full max-w-xs py-3 rounded-xl font-semibold text-center block"
          style={{ background: "var(--gray-light)", color: "var(--navy)" }}>Sign up</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto" style={{ background: "var(--card)" }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

      {(pullY > 0 || refreshing) && (
        <div className="flex items-center justify-center transition-all" style={{ height: refreshing ? "48px" : `${pullY}px`, overflow: "hidden" }}>
          <div className={`w-6 h-6 rounded-full border-2 ${refreshing ? "animate-spin" : ""}`}
            style={{ borderColor: "var(--gold)", borderTopColor: "transparent", transform: refreshing ? undefined : `rotate(${pullY * 3}deg)` }} />
        </div>
      )}

      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        <Stories />
      </div>

      {/* Feed tabs */}
      {user && (
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {(["following", "foryou"] as const).map(tab => (
            <button key={tab} onClick={() => { setFeedTab(tab); setFetching(true); }}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{ color: feedTab === tab ? "var(--navy)" : "var(--gray-mid)", borderBottom: feedTab === tab ? "2px solid var(--gold)" : "2px solid transparent" }}>
              {tab === "following" ? "Following" : "✨ For You"}
            </button>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-5xl mb-4">📷</p>
          <p className="font-semibold text-lg mb-1" style={{ color: "var(--navy)" }}>Your feed is empty</p>
          <p className="text-sm mb-5" style={{ color: "var(--gray-mid)" }}>Follow people to see their photos and videos here</p>

          {suggested.length > 0 && (
            <div className="w-full text-left">
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy)" }}>Suggested for you</p>
              {suggested.map(u => (
                <div key={u.id} className="flex items-center gap-3 mb-3">
                  <Link href={`/u/${u.username}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "var(--navy)" }}>
                      {u.avatar ? <Image src={u.avatar} alt="" width={40} height={40} className="rounded-full object-cover" /> : u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{u.username}</span>
                        {u.verified && <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                      </div>
                      <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{u._count.followers} followers</p>
                    </div>
                  </Link>
                  <button onClick={() => handleFollow(u.id)} className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ background: following[u.id] ? "var(--gray-light)" : "linear-gradient(135deg,var(--gold),var(--navy))", color: following[u.id] ? "var(--navy)" : "white" }}>
                    {following[u.id] ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          )}
          <AdCard index={3} />
        </div>
      ) : (
        <>
          {posts.flatMap((post, i) => {
            const items = [<PostCard key={post.id} post={post} currentUserId={user.id} onUpdate={() => loadPosts(true)} />];
            if (i === 3) items.push(<AdCard key="ad-first" index={0} />);
            if (i > 3 && (i + 1) % 4 === 0) items.push(<AdCard key={`ad-${i}`} index={i} />);
            if (i === 2 && suggested.length > 0) items.push(
              <div key="suggested" className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy)" }}>Suggested for you</p>
                <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {suggested.map(u => (
                    <div key={u.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-24 rounded-2xl p-3"
                      style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                      <Link href={`/u/${u.username}`}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold overflow-hidden" style={{ background: "var(--navy)" }}>
                          {u.avatar ? <Image src={u.avatar} alt="" width={56} height={56} className="rounded-full object-cover" unoptimized /> : u.username[0].toUpperCase()}
                        </div>
                      </Link>
                      <div className="flex items-center gap-0.5">
                        <span className="text-xs font-semibold truncate max-w-[72px]" style={{ color: "var(--navy)" }}>{u.username}</span>
                        {u.verified && <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                      </div>
                      {u.reason && <p className="text-[9px] text-center leading-tight" style={{ color: "var(--gray-mid)" }}>{u.reason}</p>}
                      <button onClick={() => handleFollow(u.id)} className="text-xs font-semibold px-3 py-1 rounded-lg w-full"
                        style={{ background: following[u.id] ? "var(--gray-light)" : "var(--gold)", color: following[u.id] ? "var(--navy)" : "white", fontSize: "11px" }}>
                        {following[u.id] ? "Following" : "Follow"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
            return items;
          })}
          <div ref={loaderRef} className="py-5 flex items-center justify-center">
            {hasMore
              ? <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
              : <p className="text-xs" style={{ color: "var(--gray-mid)" }}>You're all caught up ✓</p>}
          </div>
        </>
      )}
    </div>
  );
}
