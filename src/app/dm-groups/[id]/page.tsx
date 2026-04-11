"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

interface Member { id: string; username: string; avatar?: string }
interface GMsg { id: string; text?: string; mediaUrl?: string; createdAt: string; sender: { id: string; username: string; avatar?: string } }

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<GMsg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("ჯგუფი");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const res = await fetch(`/api/dm-groups/${id}`);
    if (!res.ok) { router.push("/messages"); return; }
    const data = await res.json();
    setMessages(data.messages || []);
    setMembers(data.members || []);
    if (data.name) setGroupName(data.name);
    setLoading(false);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    await fetch(`/api/dm-groups/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText(""); setSending(false); load();
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)", background: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => router.push("/messages")} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex -space-x-2 flex-shrink-0">
          {members.slice(0, 3).map(m => (
            <div key={m.id} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2"
              style={{ background: "var(--navy)", borderColor: "var(--card)" }}>
              {m.avatar ? <Image src={m.avatar} alt="" width={32} height={32} className="object-cover rounded-full" /> : m.username[0].toUpperCase()}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{groupName}</p>
          <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{members.length} წევრი</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-4xl">👥</p>
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>ჯგუფური ჩატი</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>პირველი შეტყობინება გაუგზავნე</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender.id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ background: "var(--navy)" }}>
                  {msg.sender.avatar
                    ? <Image src={msg.sender.avatar} alt="" width={24} height={24} className="object-cover rounded-full" />
                    : msg.sender.username[0].toUpperCase()}
                </div>
              )}
              <div className="max-w-[72vw]">
                {!isMe && <p className="text-xs mb-0.5 ml-1" style={{ color: "var(--gray-mid)" }}>{msg.sender.username}</p>}
                <div className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: isMe ? "var(--navy)" : "var(--gray-light)",
                    color: isMe ? "white" : "var(--navy)",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  }}>
                  {msg.mediaUrl && (
                    <Image src={msg.mediaUrl} alt="" width={200} height={200} className="rounded-xl mb-1 object-cover" unoptimized />
                  )}
                  {msg.text}
                </div>
                <p className="text-xs mt-0.5 px-1" style={{ color: "var(--gray-mid)", textAlign: isMe ? "right" : "left" }}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--card)", paddingBottom: "env(safe-area-inset-bottom,12px)" }}>
        <input type="text" placeholder="შეტყობინება..." value={text} onChange={e => setText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
          style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ background: "var(--navy)" }}>
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
