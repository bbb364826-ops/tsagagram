"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

interface Channel {
  id: string; name: string; description?: string; createdAt: string; isSubscribed: boolean;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { subscribers: number; messages: number };
}
interface BMsg {
  id: string; text?: string; mediaUrl?: string; reactions: number; createdAt: string;
  user: { id: string; username: string; avatar?: string };
}

export default function BroadcastPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<BMsg[]>([]);
  const [msgText, setMsgText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchChannels(); }, []);

  const fetchChannels = async () => {
    const res = await fetch("/api/broadcast");
    if (res.ok) setChannels(await res.json());
  };

  const fetchMessages = async (channelId: string) => {
    const res = await fetch(`/api/broadcast/messages?channelId=${channelId}`);
    if (res.ok) setMessages(await res.json());
  };

  const openChannel = (c: Channel) => { setSelected(c); fetchMessages(c.id); };

  const subscribe = async (channelId: string) => {
    await fetch("/api/broadcast/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId }) });
    fetchChannels();
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !selected) return;
    const res = await fetch("/api/broadcast/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: selected.id, text: msgText }) });
    if (res.ok) { setMsgText(""); fetchMessages(selected.id); }
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, description: newDesc }) });
    if (res.ok) { setShowCreate(false); setNewName(""); setNewDesc(""); fetchChannels(); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const isOwner = selected && user && selected.user.id === user.id;

  if (selected) {
    return (
      <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSelected(null)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "var(--gold)" }}>
            {selected.user.avatar ? <Image src={selected.user.avatar} alt="" width={36} height={36} className="object-cover" /> : <span className="text-white font-bold">{selected.name[0]}</span>}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "var(--navy)" }}>{selected.name}</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{selected._count.subscribers} subscribers</p>
          </div>
          {!isOwner && (
            <button onClick={() => subscribe(selected.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: selected.isSubscribed ? "var(--gray-light)" : "var(--gold)", color: selected.isSubscribed ? "var(--navy)" : "white" }}>
              {selected.isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📢</div>
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>No messages yet</p>
            </div>
          ) : messages.map(m => (
            <div key={m.id} className="max-w-xs">
              <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {m.text && <p className="text-sm" style={{ color: "var(--navy)" }}>{m.text}</p>}
                {m.mediaUrl && <img src={m.mediaUrl} alt="" className="rounded-xl mt-2 max-w-full" />}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {m.reactions > 0 && <span className="text-xs">❤️ {m.reactions}</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {isOwner && (
          <div className="flex gap-2 px-4 py-3" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
            <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Broadcast a message..." className="flex-1 px-4 py-2.5 rounded-full text-sm" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <button onClick={sendMessage} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        )}
        {!isOwner && (
          <div className="px-4 py-3 text-center text-xs" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", color: "var(--gray-mid)" }}>
            Only the channel owner can send messages
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Channels</h1>
        {user && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            + Create
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-6" style={{ background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--navy)" }}>Create Channel</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Channel name..."
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." rows={2}
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm resize-none" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>Cancel</button>
              <button onClick={createChannel} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24">
        {channels.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="text-6xl mb-4">📢</div>
            <p className="font-semibold" style={{ color: "var(--navy)" }}>No channels yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--gray-mid)" }}>Create a broadcast channel</p>
          </div>
        ) : channels.map(c => (
          <button key={c.id} onClick={() => openChannel(c)} className="w-full flex items-center gap-3 px-4 py-3 border-b text-left" style={{ borderColor: "var(--border)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {c.user.avatar ? <Image src={c.user.avatar} alt="" width={48} height={48} className="object-cover" /> : <span className="text-white font-bold text-lg">{c.name[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{c.name}</span>
                {c.user.verified && <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--gray-mid)" }}>{c._count.subscribers} subscribers • {c._count.messages} messages</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full flex-shrink-0"
              style={{ background: c.isSubscribed ? "var(--gray-light)" : "var(--gold)", color: c.isSubscribed ? "var(--navy)" : "white" }}>
              {c.isSubscribed ? "Subscribed" : "Subscribe"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
