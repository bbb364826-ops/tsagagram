"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserResult { id: string; username: string; name?: string; avatar?: string; verified?: boolean; isFollowing: boolean; _count: { followers: number } }
interface HashtagResult { tag: string; count: number }
interface PostResult { id: string; images: string[]; _count: { likes: number; comments: number } }

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "users" | "hashtags" | "posts">("all");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [hashtags, setHashtags] = useState<HashtagResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setUsers([]); setHashtags([]); setPosts([]); return; }
    timerRef.current = setTimeout(search, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, tab]);

  const search = async () => {
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${tab}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setHashtags(data.hashtags || []);
      setPosts(data.posts || []);
    }
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    await fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: userId }) });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u));
  };

  const formatCount = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <div style={{ background: "var(--card)", minHeight: "100vh" }}>
      {/* Search bar */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <button onClick={() => window.history.length > 1 ? router.back() : router.push("/")} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1 relative">
          <svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input ref={inputRef} type="text" placeholder="ძებნა..." value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gray-mid)" }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["all", "users", "hashtags", "posts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-3 text-xs font-semibold capitalize transition-colors"
            style={{ color: tab === t ? "var(--gold)" : "var(--gray-mid)", borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent" }}>
            {t === "all" ? "ყველა" : t === "users" ? "ანგარიშები" : t === "hashtags" ? "ჰეშთეგები" : "პოსტები"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
        </div>
      )}

      {!query && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <p className="mt-4 text-sm" style={{ color: "var(--gray-mid)" }}>მოძებნე ადამიანები, ჰეშთეგები, პოსტები</p>
        </div>
      )}

      {/* Users */}
      {(tab === "all" || tab === "users") && users.length > 0 && (
        <div>
          {tab === "all" && <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gray-mid)" }}>ანგარიშები</p>}
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Link href={`/u/${u.username}`} className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                  {u.avatar ? <Image src={u.avatar} alt="" width={48} height={48} className="object-cover w-full h-full" unoptimized /> : u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{u.username}</span>
                    {u.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                  </div>
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{u.name || ""} · {formatCount(u._count.followers)} გამომყოლი</p>
                </div>
              </Link>
              <button onClick={() => handleFollow(u.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: u.isFollowing ? "var(--gray-light)" : "linear-gradient(135deg,var(--gold),var(--navy))", color: u.isFollowing ? "var(--navy)" : "white" }}>
                {u.isFollowing ? "მიყვება" : "გამოწ."}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hashtags */}
      {(tab === "all" || tab === "hashtags") && hashtags.length > 0 && (
        <div>
          {tab === "all" && <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gray-mid)" }}>ჰეშთეგები</p>}
          {hashtags.map(h => (
            <Link key={h.tag} href={`/hashtag/${h.tag.replace(/^#/, "")}`}
              className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: "var(--gray-light)" }}>
                #
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{h.tag}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{formatCount(h.count)} პოსტი</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {(tab === "all" || tab === "posts") && posts.length > 0 && (
        <div>
          {tab === "all" && <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gray-mid)" }}>პოსტები</p>}
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(p => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
                {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <span className="text-white text-xs font-bold">❤️ {p._count.likes}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {query && !loading && users.length === 0 && hashtags.length === 0 && posts.length === 0 && (
        <div className="flex flex-col items-center py-16">
          <p className="font-semibold" style={{ color: "var(--navy)" }}>შედეგი ვერ მოიძებნა</p>
          <p className="text-sm mt-1" style={{ color: "var(--gray-mid)" }}>"{query}" - ასეთი ვერ ვიპოვე</p>
        </div>
      )}
    </div>
  );
}
