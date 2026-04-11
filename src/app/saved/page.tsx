"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Collection { id: string; name: string; cover?: string; _count: { saves: number } }
interface Post { id: string; images: string[]; _count: { likes: number; comments: number } }

export default function SavedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allSaved, setAllSaved] = useState<Post[]>([]);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [colPosts, setColPosts] = useState<Post[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState<"posts" | "collections">("posts");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) { loadAll(); loadCollections(); }
  }, [user, loading]);

  const loadAll = async () => {
    const res = await fetch("/api/posts/saved");
    if (res.ok) setAllSaved(await res.json());
  };

  const loadCollections = async () => {
    const res = await fetch("/api/collections");
    if (res.ok) setCollections(await res.json());
  };

  const loadCollection = async (id: string) => {
    const res = await fetch(`/api/collections/${id}`);
    if (res.ok) setColPosts(await res.json());
    setActiveCol(id);
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) { setNewName(""); setShowCreate(false); loadCollections(); }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("კოლექცია წაიშლება. პოსტები შენარჩუნდება.")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    loadCollections();
    if (activeCol === id) setActiveCol(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  // Collection detail view
  if (activeCol) {
    const col = collections.find(c => c.id === activeCol);
    return (
      <div style={{ background: "var(--card)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setActiveCol(null)} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <p className="font-bold text-base flex-1" style={{ color: "var(--navy)" }}>{col?.name}</p>
          <button onClick={() => deleteCollection(activeCol)} style={{ color: "#e8534a" }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {colPosts.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <p style={{ color: "var(--gray-mid)" }}>კოლექცია ცარიელია</p>
            </div>
          )}
          {colPosts.map(p => (
            <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
              {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--card)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <p className="font-bold text-base" style={{ color: "var(--navy)" }}>შენახული</p>
        <button onClick={() => setShowCreate(true)} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => setTab("posts")} className="flex-1 py-3 text-sm font-semibold"
          style={{ color: tab === "posts" ? "var(--gold)" : "var(--gray-mid)", borderBottom: tab === "posts" ? "2px solid var(--gold)" : "2px solid transparent" }}>
          ყველა პოსტი
        </button>
        <button onClick={() => setTab("collections")} className="flex-1 py-3 text-sm font-semibold"
          style={{ color: tab === "collections" ? "var(--gold)" : "var(--gray-mid)", borderBottom: tab === "collections" ? "2px solid var(--gold)" : "2px solid transparent" }}>
          კოლექციები
        </button>
      </div>

      {tab === "posts" && (
        <div className="grid grid-cols-3 gap-0.5">
          {allSaved.length === 0 && (
            <div className="col-span-3 py-16 flex flex-col items-center gap-3">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>შენახული პოსტები გამოჩნდება აქ</p>
            </div>
          )}
          {allSaved.map(p => (
            <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square block">
              {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />}
            </Link>
          ))}
        </div>
      )}

      {tab === "collections" && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {collections.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center gap-3">
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>კოლექციები არ გაქვს</p>
              <button onClick={() => setShowCreate(true)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                შექმენი კოლექცია
              </button>
            </div>
          )}
          {collections.map(col => (
            <button key={col.id} onClick={() => loadCollection(col.id)} className="text-left">
              <div className="aspect-square rounded-2xl overflow-hidden relative mb-2" style={{ background: "var(--gray-light)" }}>
                {col.cover
                  ? <Image src={col.cover} alt="" fill className="object-cover" unoptimized />
                  : <div className="w-full h-full flex items-center justify-center">
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                      </svg>
                    </div>}
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--navy)" }}>{col.name}</p>
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{col._count.saves} პოსტი</p>
            </button>
          ))}
        </div>
      )}

      {/* Create collection modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCreate(false)}>
            <div className="w-full rounded-t-3xl p-6" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
              <p className="font-bold text-base mb-4" style={{ color: "var(--navy)" }}>ახალი კოლექცია</p>
              <input type="text" placeholder="კოლექციის სახელი" value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}
                autoFocus onKeyDown={e => e.key === "Enter" && createCollection()} />
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>გაუქმება</button>
                <button onClick={createCollection} className="flex-1 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>შექმნა</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
