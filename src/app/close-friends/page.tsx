"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface FriendUser { id: string; username: string; name?: string; avatar?: string; isFriend: boolean }

export default function CloseFriendsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    setLoading(true);
    const [friendsRes, followingRes] = await Promise.all([
      fetch("/api/closefriends"),
      fetch(`/api/users/${user?.username}`),
    ]);
    const friendIds: string[] = friendsRes.ok ? (await friendsRes.json()).map((f: { id: string }) => f.id) : [];
    const profile = followingRes.ok ? await followingRes.json() : null;
    const following: { id: string; username: string; name?: string; avatar?: string }[] = profile?.following || [];
    setFriends(following.map(f => ({ ...f, isFriend: friendIds.includes(f.id) })));
    setLoading(false);
  };

  const toggle = async (friendId: string) => {
    setToggling(friendId);
    await fetch("/api/closefriends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    setFriends(prev => prev.map(f => f.id === friendId ? { ...f, isFriend: !f.isFriend } : f));
    setToggling(null);
  };

  const filtered = friends.filter(f =>
    f.username.toLowerCase().includes(query.toLowerCase()) ||
    (f.name || "").toLowerCase().includes(query.toLowerCase())
  );
  const closeFriendsList = filtered.filter(f => f.isFriend);
  const othersList = filtered.filter(f => !f.isFriend);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="sticky top-14 z-10 px-4 pt-4 pb-3" style={{ background: "var(--background)" }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--navy)" }}>Close Friends</h1>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>მხოლოდ ახლობლებს ჩვენება</p>
          </div>
        </div>
        <input type="text" placeholder="ძიება..." value={query} onChange={e => setQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--card)", color: "var(--navy)", border: "1px solid var(--border)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div>
          {/* Close Friends */}
          {closeFriendsList.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-5 h-5 rounded-full" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#22c55e" }}>
                  Close Friends ({closeFriendsList.length})
                </p>
              </div>
              <div className="mx-3 rounded-xl overflow-hidden mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {closeFriendsList.map((f, i) => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                    style={{ borderColor: "var(--border)" }}>
                    <Link href={`/u/${f.username}`} className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0 p-0.5"
                        style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--navy)" }}>
                          {f.avatar ? <Image src={f.avatar} alt="" width={40} height={40} className="object-cover w-full h-full rounded-full" /> : f.username[0].toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{f.username}</p>
                        {f.name && <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{f.name}</p>}
                      </div>
                    </Link>
                    <button onClick={() => toggle(f.id)} disabled={toggling === f.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "#22c55e" }}>
                      {toggling === f.id
                        ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        : <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Following (not close friends) */}
          {othersList.length > 0 && (
            <>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gray-mid)" }}>
                გამომყვებები
              </p>
              <div className="mx-3 rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {othersList.map((f, i) => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                    style={{ borderColor: "var(--border)" }}>
                    <Link href={`/u/${f.username}`} className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                        {f.avatar ? <Image src={f.avatar} alt="" width={40} height={40} className="object-cover w-full h-full rounded-full" /> : f.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{f.username}</p>
                        {f.name && <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{f.name}</p>}
                      </div>
                    </Link>
                    <button onClick={() => toggle(f.id)} disabled={toggling === f.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }}>
                      {toggling === f.id ? "..." : "დამატება"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-4xl">👥</p>
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>ვერ მოიძებნა</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
