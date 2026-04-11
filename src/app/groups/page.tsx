"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

interface Group {
  id: string; name: string; description?: string; avatar?: string; isPrivate: boolean; createdAt: string;
  isMember: boolean; myRole?: string;
  _count: { members: number; posts: number };
}
interface GroupPost {
  id: string; images: string[]; caption?: string; createdAt: string;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [joining, setJoining] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
  };

  const fetchPosts = async (groupId: string) => {
    const res = await fetch(`/api/groups/posts?groupId=${groupId}`);
    if (res.ok) setPosts(await res.json());
  };

  const openGroup = (g: Group) => { setSelected(g); fetchPosts(g.id); };

  const joinGroup = async (groupId: string) => {
    setJoining(j => ({ ...j, [groupId]: true }));
    const res = await fetch("/api/groups/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    if (res.ok) { await fetchGroups(); }
    setJoining(j => ({ ...j, [groupId]: false }));
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, description: newDesc }) });
    if (res.ok) { setShowCreate(false); setNewName(""); setNewDesc(""); fetchGroups(); }
  };

  if (selected) {
    return (
      <div style={{ background: "var(--background)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSelected(null)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="flex-1">
            <p className="font-bold" style={{ color: "var(--navy)" }}>{selected.name}</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{selected._count.members} members</p>
          </div>
          {!selected.isMember && (
            <button onClick={() => joinGroup(selected.id)} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>Join</button>
          )}
        </div>

        {selected.description && (
          <div className="px-4 py-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--gray-mid)" }}>{selected.description}</p>
          </div>
        )}

        <div className="pb-24">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📝</div>
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {posts.map(post => (
                <div key={post.id} className="aspect-square overflow-hidden relative">
                  <Image src={post.images[0]} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Communities</h1>
        {user && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            + Create
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-6" style={{ background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--navy)" }}>Create Community</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Community name..."
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." rows={3}
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm resize-none" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>Cancel</button>
              <button onClick={createGroup} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3 pb-24">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <p className="font-semibold" style={{ color: "var(--navy)" }}>No communities yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--gray-mid)" }}>Create the first one!</p>
          </div>
        ) : groups.map(g => (
          <div key={g.id} onClick={() => openGroup(g)} className="rounded-2xl overflow-hidden cursor-pointer" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="h-20 flex items-center px-4 gap-4" style={{ background: "linear-gradient(135deg,var(--navy),var(--gold))" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: "rgba(255,255,255,0.2)" }}>
                {g.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{g.name}</p>
                <p className="text-xs text-white/70">{g._count.members} members • {g._count.posts} posts</p>
              </div>
              {g.isMember ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Joined</span>
              ) : (
                <button onClick={e => { e.stopPropagation(); joinGroup(g.id); }} disabled={joining[g.id]}
                  className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "white", color: "var(--navy)" }}>
                  {joining[g.id] ? "..." : "Join"}
                </button>
              )}
            </div>
            {g.description && (
              <div className="px-4 py-2">
                <p className="text-sm" style={{ color: "var(--gray-mid)" }}>{g.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
