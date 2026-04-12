"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface User { id: string; username: string; avatar?: string }
interface Reaction { id: string; emoji: string; userId: string }
interface Message {
  id: string; text?: string; voiceUrl?: string; mediaUrl?: string;
  createdAt: string; read: boolean; deleted?: boolean;
  sender: User;
  reactions?: Reaction[];
}
interface Conversation { user: User; lastMessage: string; lastTime: string; unread: boolean; isRequest?: boolean }

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function VoicePlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1) * 100); }}
        onEnded={() => { setPlaying(false); setProgress(0); }} />
      <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}>
        {playing
          ? <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
      </button>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "rgba(255,255,255,0.9)" }} />
      </div>
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
      </svg>
    </div>
  );
}

function MessagesContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openUsername = searchParams.get("u");

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [reactTarget, setReactTarget] = useState<string | null>(null);
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const [vanishMode, setVanishMode] = useState(false);
  const [myNote, setMyNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<string | null>(null);
  const [forwardConvs, setForwardConvs] = useState<Conversation[]>([]);
  const [forwardingSending, setForwardingSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOnline, setSelectedOnline] = useState<{ online: boolean; lastSeen?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) loadConvs();
  }, [user, loading]);

  useEffect(() => {
    if (!openUsername || !user) return;
    fetch(`/api/users/${openUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) openChat({ id: d.id, username: d.username, avatar: d.avatar }); })
      .catch(() => {});
  }, [openUsername, user]);

  const loadConvs = async () => {
    const [res, reqRes] = await Promise.all([fetch("/api/messages"), fetch("/api/messages?requests=1")]);
    if (res.ok) setConvs(await res.json());
    if (reqRes.ok) setRequests(await reqRes.json());
  };

  const openChat = (u: User) => {
    setSelected(u);
    setSelectedOnline(null);
    loadMessages(u.id);
    // Fetch activity status
    fetch(`/api/users/${u.username}`).then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      const lastSeen = d.lastSeen ? new Date(d.lastSeen) : null;
      const online = lastSeen ? Date.now() - lastSeen.getTime() < 300000 : false;
      setSelectedOnline({ online, lastSeen: d.lastSeen });
    }).catch(() => {});

    // Replace polling with SSE
    if (sseRef.current) sseRef.current.close();
    if (pollRef.current) clearInterval(pollRef.current);
    const es = new EventSource("/api/messages/stream");
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "messages") { loadMessages(u.id); loadConvs(); }
        if (data.type === "typing") setIsTyping(data.typing);
      } catch {}
    };
    es.onerror = () => {
      // Fallback to polling if SSE fails
      es.close();
      sseRef.current = null;
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          loadMessages(u.id);
          fetch(`/api/messages/typing?senderId=${u.id}`)
            .then(r => r.json()).then(d => setIsTyping(d.typing)).catch(() => {});
        }, 3000);
      }
    };
    // Poll only for typing indicator (SSE handles new messages)
    pollRef.current = setInterval(() => {
      fetch(`/api/messages/typing?senderId=${u.id}`)
        .then(r => r.json()).then(d => setIsTyping(d.typing)).catch(() => {});
    }, 3000);
  };

  const closeChat = () => {
    setSelected(null); setMessages([]); setSelectedOnline(null);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    loadConvs();
  };

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (sseRef.current) sseRef.current.close();
  }, []);

  const loadMessages = async (userId: string) => {
    const res = await fetch(`/api/messages/${userId}`);
    if (res.ok) {
      setMessages(await res.json());
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const res = await fetch(`/api/messages/${selected.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) { setText(""); loadMessages(selected.id); loadConvs(); }
    setSending(false);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setReactTarget(null);
    await fetch("/api/messages/react", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (selected) loadMessages(selected.id);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "voice.webm");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok && selected) {
          const { url } = await uploadRes.json();
          await fetch(`/api/messages/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceUrl: url }) });
          loadMessages(selected.id);
        }
      };
      mr.start(); mediaRecorderRef.current = mr;
      setRecording(true); setRecordingTime(0);
      recordTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { /* denied */ }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop(); setRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const deleteMessage = async (messageId: string) => {
    setLongPressTarget(null);
    if (!selected) return;
    await fetch(`/api/messages/${selected.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    loadMessages(selected.id);
  };

  const openForward = (messageId: string) => {
    setForwardTarget(messageId);
    setForwardConvs(convs.filter(c => c.user.id !== selected?.id));
    setLongPressTarget(null);
  };

  const forwardMessage = async (toUserId: string) => {
    if (!forwardTarget || forwardingSending) return;
    const msg = messages.find(m => m.id === forwardTarget);
    if (!msg) return;
    setForwardingSending(true);
    await fetch(`/api/messages/${toUserId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg.text || undefined, mediaUrl: msg.mediaUrl || undefined }),
    });
    setForwardTarget(null);
    setForwardingSending(false);
  };

  const sendMedia = async (file: File) => {
    if (!selected || uploadingMedia) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) return;
      const { url } = await uploadRes.json();
      await fetch(`/api/messages/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: url }),
      });
      loadMessages(selected.id); loadConvs();
    } finally { setUploadingMedia(false); }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return `${d}დ`; if (h > 0) return `${h}სთ`; if (m > 0) return `${m}წთ`; return "ახლა";
  };

  const formatMsgTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredConvs = convs.filter(c =>
    c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  // ─── CHAT VIEW ────────────────────────────────────────────────────────────
  if (selected) {
    const grouped: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const d = new Date(msg.createdAt).toLocaleDateString("ka-GE", { day: "numeric", month: "long" });
      if (d !== currentDate) { currentDate = d; grouped.push({ date: d, messages: [msg] }); }
      else grouped[grouped.length - 1].messages.push(msg);
    }

    return (
      <div className="flex flex-col" style={{ height: "calc(100vh - 56px)", background: vanishMode ? "#1a0533" : "var(--card)" }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)", background: vanishMode ? "#2d0a52" : "var(--card)" }}>
          <button onClick={closeChat} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
            {selected.avatar
              ? <Image src={selected.avatar} alt="" width={36} height={36} className="object-cover w-full h-full rounded-full" unoptimized />
              : selected.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: vanishMode ? "white" : "var(--navy)" }}>{selected.username}</p>
            {isTyping ? (
              <p className="text-xs" style={{ color: "var(--gold)" }}>წერს...</p>
            ) : selectedOnline?.online ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-xs text-green-500">ონლაინ</p>
              </div>
            ) : selectedOnline?.lastSeen ? (
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>
                {(() => { const diff = Date.now() - new Date(selectedOnline.lastSeen!).getTime(); const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24); return d > 0 ? `${d}დ წინ` : h > 0 ? `${h}სთ წინ` : m > 0 ? `${m}წთ წინ` : "ახლახან"; })()}
              </p>
            ) : (
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Tsagagram</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setVanishMode(v => !v)}
              title="Vanish Mode"
              style={{ color: vanishMode ? "#c084fc" : "var(--gray-mid)" }}>
              <svg width="20" height="20" fill={vanishMode ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
              </svg>
            </button>
            <button onClick={() => router.push(`/call/${selected.id}?mode=audio`)} style={{ color: vanishMode ? "white" : "var(--navy)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.08 1.21 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.36a2 2 0 012.11.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
            <button onClick={() => router.push(`/call/${selected.id}?mode=video`)} style={{ color: "var(--navy)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
            <button onClick={() => router.push(`/u/${selected.username}`)} style={{ color: "var(--gray-mid)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
            </button>
          </div>
        </div>

        {/* Vanish mode banner */}
        {vanishMode && (
          <div className="px-4 py-2 text-center" style={{ background: "#2d0a52" }}>
            <p className="text-xs text-purple-300">👁️ Vanish Mode ჩართულია — შეტყობინებები გაქრება</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1"
          onClick={() => setReactTarget(null)}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold" style={{ background: "var(--navy)" }}>
                {selected.avatar
                  ? <Image src={selected.avatar} alt="" width={64} height={64} className="object-cover w-full h-full rounded-full" unoptimized />
                  : selected.username[0].toUpperCase()}
              </div>
              <p className="font-semibold" style={{ color: "var(--navy)" }}>{selected.username}</p>
              <p className="text-sm" style={{ color: "var(--gray-mid)" }}>პირველი შეტყობინება გაუგზავნე</p>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--gray-mid)" }}>{group.date}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              {group.messages.map(msg => {
                const isMe = msg.sender.id === user?.id;
                const myReaction = msg.reactions?.find(r => r.userId === user?.id);
                const otherReactions = msg.reactions?.filter(r => r.userId !== user?.id) || [];
                const allReactions = msg.reactions || [];

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 mb-1 group`}
                    onContextMenu={e => { e.preventDefault(); if (isMe && !msg.deleted) setLongPressTarget(msg.id); }}>
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1"
                        style={{ background: "var(--navy)" }}>
                        {msg.sender.avatar
                          ? <Image src={msg.sender.avatar} alt="" width={24} height={24} className="object-cover w-full h-full rounded-full" unoptimized />
                          : msg.sender.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="relative max-w-[72vw]">
                      {/* Reaction picker trigger */}
                      <button
                        onClick={e => { e.stopPropagation(); setReactTarget(reactTarget === msg.id ? null : msg.id); }}
                        className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ [isMe ? "left" : "right"]: "-28px", bottom: "4px" }}>
                        <span className="text-base">☺</span>
                      </button>

                      {/* Reaction picker */}
                      {reactTarget === msg.id && (
                        <div className="absolute z-20 flex gap-1 p-2 rounded-2xl shadow-xl"
                          style={{
                            [isMe ? "right" : "left"]: "0",
                            bottom: "calc(100% + 8px)",
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                          onClick={e => e.stopPropagation()}>
                          {REACTION_EMOJIS.map(em => (
                            <button key={em} onClick={() => handleReact(msg.id, em)}
                              className="text-xl hover:scale-125 transition-transform active:scale-90"
                              style={{ lineHeight: 1 }}>
                              {em}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message bubble */}
                      {msg.mediaUrl && !msg.deleted ? (
                        <div className="rounded-2xl overflow-hidden" style={{ maxWidth: "220px", borderBottomRightRadius: isMe ? "4px" : undefined, borderBottomLeftRadius: !isMe ? "4px" : undefined }}>
                          {(msg.mediaUrl.match(/\.(mp4|webm|mov)$/i) || (msg.mediaUrl.includes("cloudinary.com") && msg.mediaUrl.includes("/video/")))
                            ? <video src={msg.mediaUrl} className="w-full rounded-2xl" controls />
                            : <Image src={msg.mediaUrl} alt="media" width={220} height={220} className="object-cover w-full" unoptimized />}
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 rounded-2xl text-sm"
                          style={{
                            background: isMe ? "linear-gradient(135deg,var(--gold),var(--navy))" : "var(--gray-light)",
                            color: isMe ? "white" : "var(--navy)",
                            borderBottomRightRadius: isMe ? "4px" : undefined,
                            borderBottomLeftRadius: !isMe ? "4px" : undefined,
                            opacity: msg.deleted ? 0.5 : 1,
                            fontStyle: msg.deleted ? "italic" : undefined,
                          }}>
                          {msg.deleted ? "შეტყობინება წაიშალა" : msg.voiceUrl ? <VoicePlayer url={msg.voiceUrl} /> : msg.text}
                        </div>
                      )}

                      {/* Reactions display */}
                      {allReactions.length > 0 && (
                        <div className={`flex gap-0.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: "var(--gray-light)", border: "1px solid var(--border)" }}>
                            {[...new Set(allReactions.map(r => r.emoji))].slice(0, 3).map(em => (
                              <span key={em}>{em}</span>
                            ))}
                            {allReactions.length > 1 && <span style={{ color: "var(--gray-mid)" }}>{allReactions.length}</span>}
                          </div>
                        </div>
                      )}

                      <p className={`text-[10px] mt-0.5 ${isMe ? "text-right" : ""}`} style={{ color: "var(--gray-mid)" }}>
                        {formatMsgTime(msg.createdAt)}
                        {isMe && msg.read && <span className="ml-1" style={{ color: "var(--gold)" }}>✓✓</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start items-end gap-2 mb-1">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "var(--navy)" }}>
                {selected?.avatar
                  ? <Image src={selected.avatar} alt="" width={24} height={24} className="object-cover w-full h-full rounded-full" unoptimized />
                  : selected?.username[0].toUpperCase()}
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--gray-light)", borderBottomLeftRadius: "4px" }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--gray-mid)", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Delete message modal */}
        {longPressTarget && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setLongPressTarget(null)}>
            <div className="w-full rounded-t-3xl" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} />
              <button onClick={() => openForward(longPressTarget)}
                className="w-full px-6 py-4 text-left font-semibold border-b flex items-center gap-3"
                style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                გაგზავნა (Forward)
              </button>
              <button onClick={() => deleteMessage(longPressTarget)}
                className="w-full px-6 py-4 text-left font-semibold border-b flex items-center gap-3"
                style={{ color: "#e8534a", borderColor: "var(--border)" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                ყველასთვის წაშლა
              </button>
              <button onClick={() => setLongPressTarget(null)} className="w-full px-6 py-4 text-left mb-2" style={{ color: "var(--gray-mid)" }}>
                გაუქმება
              </button>
            </div>
          </div>
        )}

        {/* Forward message modal */}
        {forwardTarget && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setForwardTarget(null)}>
            <div className="w-full rounded-t-3xl max-h-[60vh] overflow-hidden flex flex-col" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: "var(--border)" }} />
              <p className="px-6 py-2 font-semibold text-sm border-b" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>გაგზავნა:</p>
              <div className="overflow-y-auto flex-1">
                {forwardConvs.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--gray-mid)" }}>სხვა მომხმარებელი არ არის</p>
                ) : forwardConvs.map(c => (
                  <button key={c.user.id} onClick={() => forwardMessage(c.user.id)} disabled={forwardingSending}
                    className="w-full flex items-center gap-3 px-6 py-3 border-b text-left active:opacity-70"
                    style={{ borderColor: "var(--border)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: "var(--navy)" }}>
                      {c.user.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--navy)" }}>{c.user.username}</span>
                    {forwardingSending && <div className="ml-auto w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />}
                  </button>
                ))}
              </div>
              <button onClick={() => setForwardTarget(null)} className="w-full px-6 py-4 text-left mb-2" style={{ color: "var(--gray-mid)" }}>
                გაუქმება
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--card)", paddingBottom: "env(safe-area-inset-bottom,12px)" }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) sendMedia(f); e.target.value = ""; }} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
            {uploadingMedia
              ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
              : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
          </button>
          {recording ? (
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-full" style={{ background: "var(--gray-light)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#e8534a" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
                {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-xs" style={{ color: "var(--gray-mid)" }}>გაუშვი გასაგზავნად</span>
            </div>
          ) : (
            <input ref={inputRef} type="text" placeholder="შეტყობინება..." value={text}
              onChange={e => {
                setText(e.target.value);
                if (selected) {
                  fetch("/api/messages/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: selected.id }) }).catch(() => {});
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
          )}

          {text.trim() ? (
            <button type="submit" disabled={sending}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          ) : (
            <button type="button"
              onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={startRecording} onTouchEnd={stopRecording}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: recording ? "#e8534a" : "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              <svg width="18" height="18" fill="white" stroke="white" strokeWidth="0.5" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path fill="none" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            </button>
          )}
        </form>
      </div>
    );
  }

  // ─── MESSAGE REQUESTS VIEW ───────────────────────────────────────────────
  if (showRequests) {
    return (
      <div style={{ background: "var(--card)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setShowRequests(false)} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>შეტყობინების მოთხოვნები</p>
        </div>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gray-light)" }}>
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <p className="font-semibold" style={{ color: "var(--navy)" }}>მოთხოვნა არ გაქვს</p>
          </div>
        ) : requests.map(req => (
          <div key={req.user.id} className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: "var(--navy)" }}>
              {req.user.avatar
                ? <Image src={req.user.avatar} alt="" width={56} height={56} className="object-cover w-full h-full rounded-full" unoptimized />
                : req.user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{req.user.username}</p>
              <p className="text-sm truncate" style={{ color: "var(--gray-mid)" }}>{req.lastMessage || "..."}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => {
                fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: req.user.id, action: "accept" }) })
                  .then(() => { loadConvs(); openChat(req.user); setShowRequests(false); });
              }} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: "var(--navy)" }}>
                მიღება
              </button>
              <button onClick={() => {
                fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: req.user.id, action: "decline" }) })
                  .then(() => loadConvs());
              }} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                უარყოფა
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── CONVERSATIONS LIST ───────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--card)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>{user?.username}</p>
        <div className="flex gap-2">
          <button onClick={() => setShowSearch(s => !s)} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <button onClick={() => { const name = prompt("ჯგუფის სახელი:"); if (name) alert("ჯგუფის ფუნქცია მალე!"); }} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="ძიება..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)" }} autoFocus />
          </div>
        </div>
      )}

      {/* Notes strip */}
      <div className="px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "var(--border)", scrollbarWidth: "none" }}>
        <div className="flex gap-4 items-center">
          {/* My note */}
          <button onClick={() => setShowNoteInput(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
                style={{ background: "var(--navy)", border: "2px solid var(--border)" }}>
                {user?.username?.[0]?.toUpperCase() || "?"}
              </div>
              {myNote && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs whitespace-nowrap max-w-[120px] truncate"
                  style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--navy)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  {myNote}
                </div>
              )}
            </div>
            <span className="text-xs" style={{ color: "var(--gray-mid)" }}>Notes</span>
          </button>
          {/* Others' notes (from convs) */}
          {convs.slice(0, 6).map(c => (
            <div key={c.user.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
                style={{ background: "var(--navy)", border: "2px solid var(--border)" }}>
                {c.user.username[0].toUpperCase()}
              </div>
              <span className="text-xs truncate w-14 text-center" style={{ color: "var(--gray-mid)" }}>{c.user.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note input modal */}
      {showNoteInput && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowNoteInput(false)}>
          <div className="w-full rounded-t-3xl p-6" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <p className="font-bold mb-1" style={{ color: "var(--navy)" }}>Notes</p>
            <p className="text-xs mb-3" style={{ color: "var(--gray-mid)" }}>60-სიმბოლოიანი სტატუსი — 24 საათი ჩანს</p>
            <input type="text" maxLength={60} placeholder="რას ფიქრობ?" value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowNoteInput(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>გაუქმება</button>
              <button onClick={() => { setMyNote(noteInput); setShowNoteInput(false); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                {noteInput ? "გაგზავნა" : "წაშლა"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message requests banner */}
      {requests.length > 0 && (
        <button onClick={() => setShowRequests(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 border-b text-left"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>შეტყობინების მოთხოვნები</p>
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{requests.length} ახალი მოთხოვნა</p>
            </div>
          </div>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {filteredConvs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gray-light)" }}>
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <p className="font-semibold text-lg mb-1" style={{ color: "var(--navy)" }}>
            {searchQuery ? "ვერ მოიძებნა" : "შეტყობინებები არ არის"}
          </p>
          <p className="text-sm" style={{ color: "var(--gray-mid)" }}>
            {searchQuery ? `"${searchQuery}" - ასეთი საუბარი არ გაქვს` : "პროფილის გვერდიდან მიწერე მეგობრებს"}
          </p>
        </div>
      ) : filteredConvs.map(conv => (
        <button key={conv.user.id} onClick={() => openChat(conv.user)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b active:opacity-70 text-left"
          style={{ borderColor: "var(--border)" }}>
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg" style={{ background: "var(--navy)" }}>
              {conv.user.avatar
                ? <Image src={conv.user.avatar} alt="" width={56} height={56} className="object-cover w-full h-full rounded-full" unoptimized />
                : conv.user.username[0].toUpperCase()}
            </div>
            {conv.unread && <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2" style={{ background: "var(--gold)", borderColor: "var(--card)" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{conv.user.username}</span>
              <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--gray-mid)" }}>{timeAgo(conv.lastTime)}</span>
            </div>
            <p className="text-sm truncate mt-0.5" style={{
              color: conv.unread ? "var(--navy)" : "var(--gray-mid)",
              fontWeight: conv.unread ? 600 : 400
            }}>
              {conv.lastMessage || "📷 ფოტო"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Messages() {
  return <Suspense><MessagesContent /></Suspense>;
}
