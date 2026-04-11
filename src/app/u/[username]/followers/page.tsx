"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface FollowUser {
  id: string; username: string; name?: string; avatar?: string; verified?: boolean;
  isFollowing: boolean; isMe: boolean;
  _count: { followers: number };
}

export default function FollowersPage() {
  const { username } = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: me } = useAuth();
  const tab = (searchParams.get("tab") || "followers") as "followers" | "following";
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const load = async (t: string) => {
    setLoading(true);
    const res = await fetch(`/api/users/${username}/${t}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
      const fm: Record<string, boolean> = {};
      data.forEach((u: FollowUser) => { fm[u.id] = u.isFollowing; });
      setFollowing(fm);
    }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [username, tab]);

  const handleFollow = async (userId: string) => {
    setFollowing(f => ({ ...f, [userId]: !f[userId] }));
    await fetch("/api/follow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
  };

  const switchTab = (t: string) => {
    router.push(`/u/${username}/followers?tab=${t}`);
  };

  return (
    <div style={{ background: "var(--card)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-14 z-10"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-bold" style={{ color: "var(--navy)" }}>{username}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {["followers", "following"].map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className="flex-1 py-3 text-sm font-semibold capitalize"
            style={{ color: tab === t ? "var(--navy)" : "var(--gray-mid)", borderBottom: tab === t ? "2px solid var(--navy)" : "2px solid transparent" }}>
            {t === "followers" ? "გამომყვები" : "მიყვება"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-4xl mb-3">{tab === "followers" ? "👥" : "🔍"}</p>
          <p className="font-semibold" style={{ color: "var(--navy)" }}>
            {tab === "followers" ? "გამომყვები ჯერ არ არის" : "ჯერ არავინ მიყვება"}
          </p>
        </div>
      ) : (
        <div>
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Link href={`/u/${u.username}`} className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
                  style={{ background: "var(--navy)" }}>
                  {u.avatar ? <Image src={u.avatar} alt="" width={48} height={48} className="object-cover w-full h-full rounded-full" unoptimized /> : u.username[0].toUpperCase()}
                </div>
              </Link>
              <Link href={`/u/${u.username}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{u.username}</p>
                  {u.verified && <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                </div>
                {u.name && <p className="text-xs truncate" style={{ color: "var(--gray-mid)" }}>{u.name}</p>}
              </Link>
              {me && !u.isMe && (
                <button onClick={() => handleFollow(u.id)}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0"
                  style={{
                    background: following[u.id] ? "var(--gray-light)" : "linear-gradient(135deg,var(--gold),var(--navy))",
                    color: following[u.id] ? "var(--navy)" : "white",
                  }}>
                  {following[u.id] ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
