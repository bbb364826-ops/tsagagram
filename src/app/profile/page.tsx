"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

interface Highlight { id: string; title: string; cover?: string; stories: { id: string; media: string }[] }

const tabs = [
  { label: "პოსტები", icon: (a: boolean) => <svg width="20" height="20" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { label: "Reels", icon: (a: boolean) => <svg width="20" height="20" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20"/></svg> },
  { label: "შენახული", icon: (a: boolean) => <svg width="20" height="20" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> },
];

interface SavedAccount { username: string; token: string; avatar?: string }

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", website: "", pronouns: "" });
  const [posts, setPosts] = useState<{ id: string; image: string }[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewHighlight, setShowNewHighlight] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Load saved accounts from server
  useEffect(() => {
    if (!user) return;
    // Auto-save current account on profile open
    fetch("/api/auth/saved-accounts", { method: "POST" }).catch(() => {});
    fetch("/api/auth/saved-accounts")
      .then(r => r.ok ? r.json() : [])
      .then(setSavedAccounts)
      .catch(() => {});
  }, [user]);

  const switchAccount = async (account: SavedAccount) => {
    setShowAccountSwitcher(false);
    const res = await fetch("/api/auth/saved-accounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: account.username }),
    });
    if (res.ok) {
      await refresh();
      router.push("/profile");
    }
  };

  const addNewAccount = async () => {
    setShowAccountSwitcher(false);
    router.push("/login");
  };

  const loadData = async (username: string) => {
    const [userRes, hlRes] = await Promise.all([
      fetch(`/api/users/${username}`).then(r => r.json()),
      fetch(`/api/highlights?username=${username}`).then(r => r.ok ? r.json() : []),
    ]);
    const rawPosts = userRes.posts || [];
    setPosts(rawPosts.map((p: { id: string; images: string | string[] }) => ({
      id: p.id,
      image: (() => { try { const imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; return Array.isArray(imgs) ? imgs[0] : imgs; } catch { return p.images; } })(),
    })));
    setHighlights(hlRes);
  };

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    setForm({ name: user.name || "", bio: user.bio || "", website: user.website || "", pronouns: (user as { pronouns?: string }).pronouns || "" });
    loadData(user.username);
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await res.json();
    await fetch(`/api/users/${user!.username}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, avatar: url }),
    });
    refresh();
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/users/${user!.username}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false); setEditing(false); refresh();
  };

  const handleCreateHighlight = async () => {
    if (!newHighlightTitle.trim()) return;
    const res = await fetch("/api/highlights", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newHighlightTitle }),
    });
    if (res.ok) {
      setShowNewHighlight(false); setNewHighlightTitle("");
      loadData(user!.username);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    await fetch("/api/highlights", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setHighlights(h => h.filter(x => x.id !== id));
  };

  if (!user) return null;

  return (
    <div style={{ background: "var(--card)" }}>
      <div className="px-4 pt-4 pb-3">
        {/* Avatar + stats */}
        <div className="flex items-center gap-6 mb-4">
          <button onClick={() => avatarRef.current?.click()} className="relative">
            <div className="story-ring">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold m-1" style={{ background: "var(--navy)" }}>
                {user.avatar
                  ? <Image src={user.avatar} alt="" width={80} height={80} className="object-cover w-full h-full rounded-full" unoptimized />
                  : user.username[0].toUpperCase()}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "var(--gold)", border: "2px solid white" }}>
              <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </button>
          <div className="flex-1">
            <div className="flex gap-5 text-center">
              {[{n: posts.length, l:"პოსტი"}, {n: user._count?.followers||0, l:"გამომყვ."}, {n: user._count?.following||0, l:"მიყვება"}].map(s => (
                <div key={s.l}>
                  <p className="font-bold text-base" style={{ color: "var(--navy)" }}>{s.n >= 1000 ? `${(s.n/1000).toFixed(1)}K` : s.n}</p>
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio / Edit */}
        {editing ? (
          <div className="flex flex-col gap-2 mb-3">
            {[{ key: "name", placeholder: "სახელი", type: "text" }, { key: "pronouns", placeholder: "ნაცვალსახელი (მაგ: ის/მას)", type: "text" }, { key: "bio", placeholder: "ბიო", type: "text" }, { key: "website", placeholder: "ვებსაიტი", type: "url" }].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }} />
            ))}
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>გაუქმება</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                {saving ? "..." : "შენახვა"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>
                {user.name || user.username}
                {(user as { pronouns?: string }).pronouns && (
                  <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--gray-mid)" }}>
                    {(user as { pronouns?: string }).pronouns}
                  </span>
                )}
              </p>
              <button onClick={() => { setShowAccountSwitcher(true); }}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 8l4 4-4 4M7 8l-4 4 4 4M3 12h18"/></svg>
                ანგარიშები
              </button>
            </div>
            {user.bio && <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: "var(--navy)" }}>{user.bio}</p>}
            {user.website && <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold" style={{ color: "var(--gold)" }}>{user.website}</a>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setEditing(true)} className="flex-1 py-1.5 text-sm font-semibold rounded-lg" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                Edit profile
              </button>
              <Link href="/close-friends" className="px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center justify-center" style={{ background: "var(--gray-light)", color: "#22c55e" }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4" fill="none" stroke="white" strokeWidth="2"/></svg>
              </Link>
              <Link href={`/qr/${user.username}`} className="px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center justify-center" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="19" y="14" width="2" height="2" rx="0.5"/><rect x="14" y="19" width="2" height="2" rx="0.5"/><rect x="18" y="19" width="3" height="2" rx="0.5"/></svg>
              </Link>
              <Link href="/settings" className="px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center justify-center" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Story Highlights */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {/* New highlight button */}
          <button onClick={() => setShowNewHighlight(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed"
              style={{ borderColor: "var(--border)" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span className="text-xs" style={{ color: "var(--gray-mid)" }}>ახალი</span>
          </button>

          {/* Existing highlights */}
          {highlights.map(h => (
            <button key={h.id} className="flex flex-col items-center gap-1 flex-shrink-0"
              onContextMenu={e => { e.preventDefault(); if (confirm(`"${h.title}" წაშლა?`)) handleDeleteHighlight(h.id); }}>
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: "var(--gray-light)", border: "2px solid var(--border)" }}>
                {h.stories?.[0]?.media ? (
                  <Image src={h.stories[0].media} alt="" width={64} height={64} className="object-cover w-full h-full rounded-full" unoptimized />
                ) : (
                  <span className="text-2xl">⭐</span>
                )}
              </div>
              <span className="text-xs truncate w-16 text-center" style={{ color: "var(--navy)" }}>{h.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* New highlight modal */}
      {showNewHighlight && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowNewHighlight(false)}>
          <div className="w-full sm:max-w-sm mx-4 rounded-2xl p-5" style={{ background: "var(--card)" }}
            onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-base mb-4 text-center" style={{ color: "var(--navy)" }}>ახალი Highlight</p>
            <input type="text" placeholder="სახელი (მაგ: ცხოვრება, მოგზაურობა)"
              value={newHighlightTitle} onChange={e => setNewHighlightTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-3"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }}
              autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowNewHighlight(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>გაუქმება</button>
              <button onClick={handleCreateHighlight} disabled={!newHighlightTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>შექმნა</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-t border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab, i) => (
          <button key={tab.label} onClick={() => setActiveTab(i)} className="flex-1 flex items-center justify-center py-2.5 transition-colors"
            style={{ color: activeTab === i ? "var(--gold)" : "var(--gray-mid)", borderBottom: activeTab === i ? "2px solid var(--gold)" : "2px solid transparent" }}>
            {tab.icon(activeTab === i)}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {posts.length === 0 ? (
          <div className="col-span-3 py-12 flex flex-col items-center gap-2">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-sm" style={{ color: "var(--gray-mid)" }}>პოსტები არ არის</p>
            <Link href="/create" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
              პირველი პოსტი
            </Link>
          </div>
        ) : posts.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
            {p.image ? (
              p.image.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={p.image} muted loop className="w-full h-full object-cover" />
              ) : (
                <Image src={p.image} alt="" fill className="object-cover" unoptimized />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: "var(--gray-light)" }}>📷</div>
            )}
          </Link>
        ))}
      </div>

      {/* Account switcher modal */}
      {showAccountSwitcher && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowAccountSwitcher(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} />
            <p className="px-6 pb-3 font-bold text-base border-b" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>ანგარიშის გადართვა</p>

            {/* Current account */}
            <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--navy)" }}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{user.username}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>მიმდინარე ანგარიში</p>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
                <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>

            {/* Saved accounts */}
            {savedAccounts.filter(a => a.username !== user.username).map(a => (
              <button key={a.username} onClick={() => switchAccount(a)}
                className="w-full flex items-center gap-3 px-6 py-4 border-b text-left active:opacity-70"
                style={{ borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: "var(--navy)" }}>
                  {a.avatar
                    ? <Image src={a.avatar} alt="" width={40} height={40} className="object-cover w-full h-full rounded-full" />
                    : a.username[0].toUpperCase()}
                </div>
                <p className="flex-1 font-medium text-sm" style={{ color: "var(--navy)" }}>{a.username}</p>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}

            {/* Add account */}
            <button onClick={addNewAccount}
              className="w-full flex items-center gap-3 px-6 py-4 border-b active:opacity-70"
              style={{ borderColor: "var(--border)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--gray-light)", border: "2px dashed var(--border)" }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>ანგარიშის დამატება</p>
            </button>

            <button onClick={() => setShowAccountSwitcher(false)} className="w-full px-6 py-4 text-sm mb-2" style={{ color: "var(--gray-mid)" }}>
              გაუქმება
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
