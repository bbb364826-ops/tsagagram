"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface UserProfile {
  id: string; username: string; name?: string; bio?: string; avatar?: string; website?: string;
  verified?: boolean; pronouns?: string;
  isFollowing: boolean; isOwnProfile: boolean; isPrivate?: boolean; isLocked?: boolean;
  isBlocked?: boolean; isMuted?: boolean; mutePosts?: boolean; muteStories?: boolean;
  hasRequestedFollow?: boolean; followsYou?: boolean; lastSeen?: string;
  _count: { posts: number; followers: number; following: number };
  posts: { id: string; images: string | string[]; _count: { likes: number; comments: number } }[];
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muteMenu, setMuteMenu] = useState(false);
  const [mutePosts, setMutePosts] = useState(false);
  const [muteStories, setMuteStories] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<"posts" | "reels" | "tagged">("posts");
  const [taggedPosts, setTaggedPosts] = useState<{ id: string; images: string[]; _count: { likes: number; comments: number } }[]>([]);

  const load = async () => {
    const res = await fetch(`/api/users/${username}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    data.posts = (data.posts || []).map((p: { id: string; images: string | string[]; _count: { likes: number; comments: number } }) => ({
      ...p,
      image: (() => { try { const imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; return Array.isArray(imgs) ? imgs[0] : imgs; } catch { return p.images; } })(),
    }));
    setProfile(data);
    setFollowing(data.isFollowing);
    setRequested(data.hasRequestedFollow ?? false);
    setBlocked(data.isBlocked ?? false);
    setMutePosts(data.mutePosts ?? false);
    setMuteStories(data.muteStories ?? false);
    setLoading(false);
  };

  useEffect(() => { load(); }, [username]);

  const handleFollow = async () => {
    if (!me || !profile) return;
    const res = await fetch("/api/follow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    setShowOptions(false);
    const res = await fetch("/api/block", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setBlocked(data.blocked);
      if (data.blocked) { setFollowing(false); setRequested(false); }
    }
  };

  const handleMute = async (posts: boolean, stories: boolean) => {
    if (!profile) return;
    const res = await fetch("/api/mute", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id, mutePosts: posts, muteStories: stories }),
    });
    if (res.ok) { setMutePosts(posts); setMuteStories(stories); }
    setMuteMenu(false);
  };

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  const activityStatus = () => {
    if (!profile?.lastSeen) return null;
    const diff = Date.now() - new Date(profile.lastSeen).getTime();
    if (diff < 5 * 60 * 1000) return "ახლა აქტიური";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}წთ წინ`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}სთ წინ`;
    return null;
  };
  const status = !profile?.isOwnProfile && following ? activityStatus() : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <p className="text-lg font-semibold" style={{ color: "var(--navy)" }}>მომხმარებელი ვერ მოიძებნა</p>
    </div>
  );

  if ((profile as unknown as { blockedByTarget?: boolean }).blockedByTarget) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gray-light)" }}>
        <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>
      <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>@{username}</p>
      <p className="text-sm mt-2" style={{ color: "var(--gray-mid)" }}>ამ მომხმარებელმა შეზღუდა თქვენი წვდომა</p>
    </div>
  );

  const posts = profile.posts as unknown as { id: string; image: string; _count: { likes: number; comments: number } }[];

  return (
    <div style={{ background: "var(--card)" }}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-6 mb-4">
          <div className="story-ring">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold m-1" style={{ background: "var(--navy)" }}>
              {profile.avatar ? <Image src={profile.avatar} alt="" width={80} height={80} className="object-cover w-full h-full" /> : profile.username[0].toUpperCase()}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex gap-5 text-center">
              <div>
                <p className="font-bold text-base" style={{ color: "var(--navy)" }}>{formatCount(profile._count.posts)}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>პოსტი</p>
              </div>
              <Link href={`/u/${username}/followers?tab=followers`}>
                <p className="font-bold text-base" style={{ color: "var(--navy)" }}>{formatCount(profile._count.followers)}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>გამომყვ.</p>
              </Link>
              <Link href={`/u/${username}/followers?tab=following`}>
                <p className="font-bold text-base" style={{ color: "var(--navy)" }}>{formatCount(profile._count.following)}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>მიყვება</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{profile.name || profile.username}</p>
            {profile.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          </div>
          {profile.followsYou && !profile.isOwnProfile && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: "var(--gray-light)", color: "var(--gray-mid)" }}>
              გამოგყვება
            </span>
          )}
        </div>
        {profile.pronouns && <p className="text-xs mt-0.5" style={{ color: "var(--gray-mid)" }}>{profile.pronouns}</p>}
        {profile.bio && <p className="text-sm mt-0.5 whitespace-pre-line" style={{ color: "var(--navy)" }}>{profile.bio}</p>}
        {profile.website && <a href={profile.website} className="text-sm mt-0.5 block" style={{ color: "var(--gold)" }}>{profile.website}</a>}
        {status && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#4caf50" }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#4caf50" }} />{status}</p>}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {profile.isOwnProfile ? (
            <>
              <Link href="/profile" className="flex-1 py-1.5 text-sm font-semibold rounded-lg text-center" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                პროფილის რედაქტ.
              </Link>
              <Link href="/follow-requests" className="px-3 py-1.5 text-sm font-semibold rounded-lg text-center" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </Link>
            </>
          ) : blocked ? (
            <button onClick={handleBlock} className="flex-1 py-1.5 text-sm font-semibold rounded-lg"
              style={{ background: "var(--gray-light)", color: "#e8534a" }}>
              განბლოკვა
            </button>
          ) : (
            <>
              <button onClick={handleFollow} className="flex-1 py-1.5 text-sm font-semibold rounded-lg"
                style={{
                  background: following ? "var(--gray-light)" : requested ? "var(--gray-light)" : "linear-gradient(135deg,var(--gold),var(--navy))",
                  color: (following || requested) ? "var(--navy)" : "white"
                }}>
                {following ? "გამოწერილია" : requested ? "მოთხოვნა გაგზავნილია" : "გამოწერა"}
              </button>
              <Link href={`/messages?u=${profile.username}`} className="flex-1 py-1.5 text-sm font-semibold rounded-lg text-center"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                შეტყობინება
              </Link>
              <button onClick={() => setShowOptions(true)} className="px-3 py-1.5 rounded-lg" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile tabs */}
      <div className="flex border-t border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { key: "posts", icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
          { key: "reels", icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg> },
          { key: "tagged", icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
        ].map(t => (
          <button key={t.key} onClick={() => {
            setProfileTab(t.key as "posts" | "reels" | "tagged");
            if (t.key === "tagged" && taggedPosts.length === 0) {
              fetch(`/api/users/${username}/tagged`).then(r => r.ok ? r.json() : []).then(setTaggedPosts);
            }
          }}
            className="flex-1 py-3 flex items-center justify-center"
            style={{ color: profileTab === t.key ? "var(--navy)" : "var(--gray-mid)", borderBottom: profileTab === t.key ? "2px solid var(--navy)" : "2px solid transparent" }}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-3 gap-0.5" style={{ borderColor: "var(--border)" }}>
        {profile.isLocked ? (
          <div className="col-span-3 py-16 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>ეს ანგარიში პრივატულია</p>
            <p className="text-sm text-center px-8" style={{ color: "var(--gray-mid)" }}>პოსტების სანახავად გამოიწერე ამ მომხმარებელს</p>
          </div>
        ) : blocked ? (
          <div className="col-span-3 py-16 flex flex-col items-center gap-3">
            <p className="text-sm" style={{ color: "var(--gray-mid)" }}>ეს ანგარიში ბლოკირებულია</p>
          </div>
        ) : blocked ? (
          <div className="col-span-3 py-12 text-center"><p style={{ color: "var(--gray-mid)" }}>ბლოკირებული</p></div>
        ) : profileTab === "tagged" ? (
          taggedPosts.length === 0
            ? <div className="col-span-3 py-12 text-center"><p style={{ color: "var(--gray-mid)" }}>არ არის</p></div>
            : taggedPosts.map(p => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
                {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />}
              </Link>
            ))
        ) : profileTab === "reels" ? (
          posts.filter(p => p.image?.match?.(/\.(mp4|webm|mov)/i)).length === 0
            ? <div className="col-span-3 py-12 text-center"><p style={{ color: "var(--gray-mid)" }}>Reels არ არის</p></div>
            : posts.filter(p => p.image?.match?.(/\.(mp4|webm|mov)/i)).map(p => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block bg-black">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </Link>
            ))
        ) : posts.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <p style={{ color: "var(--gray-mid)" }}>პოსტები არ არის</p>
          </div>
        ) : posts.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
            {p.image && <Image src={p.image} alt="" fill className="object-cover" unoptimized />}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.3)" }}>
              <span className="text-white text-xs font-semibold">❤️ {p._count.likes}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Options sheet */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowOptions(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: "var(--border)" }} />
            <button onClick={() => { setShowOptions(false); setMuteMenu(true); }}
              className="w-full px-6 py-4 text-left text-sm font-medium border-b flex items-center gap-3"
              style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>
              {(mutePosts || muteStories) ? "დადუმების პარამეტრები" : "დადუმება"}
            </button>
            <button onClick={handleBlock}
              className="w-full px-6 py-4 text-left text-sm font-medium border-b flex items-center gap-3"
              style={{ color: "#e8534a", borderColor: "var(--border)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              {blocked ? "განბლოკვა" : "დაბლოკვა"}
            </button>
            <button onClick={() => setShowOptions(false)}
              className="w-full px-6 py-4 text-left text-sm font-medium mb-2"
              style={{ color: "var(--gray-mid)" }}>
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {/* Mute options */}
      {muteMenu && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMuteMenu(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: "var(--border)" }} />
            <p className="text-base font-bold px-6 py-3" style={{ color: "var(--navy)" }}>დადუმება</p>
            <button onClick={() => handleMute(!mutePosts, muteStories)}
              className="w-full px-6 py-4 text-left text-sm border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--navy)" }}>პოსტები</span>
              <div className="w-11 h-6 rounded-full relative" style={{ background: mutePosts ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: mutePosts ? "calc(100% - 22px)" : "2px" }} />
              </div>
            </button>
            <button onClick={() => handleMute(mutePosts, !muteStories)}
              className="w-full px-6 py-4 text-left text-sm border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--navy)" }}>სთორები</span>
              <div className="w-11 h-6 rounded-full relative" style={{ background: muteStories ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: muteStories ? "calc(100% - 22px)" : "2px" }} />
              </div>
            </button>
            <button onClick={() => setMuteMenu(false)} className="w-full px-6 py-4 text-sm mb-2" style={{ color: "var(--gray-mid)" }}>დახურვა</button>
          </div>
        </div>
      )}
    </div>
  );
}
