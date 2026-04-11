"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

interface LiveStream {
  id: string; title: string; viewers: number; createdAt: string;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
}
interface LiveMsg { id: string; text: string; username: string; avatar?: string; createdAt: string; }

export default function LivePage() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [watching, setWatching] = useState<LiveStream | null>(null);
  const [streaming, setStreaming] = useState<LiveStream | null>(null);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [msgText, setMsgText] = useState("");
  const [title, setTitle] = useState("");
  const [showStart, setShowStart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgTime = useRef<string>("");

  useEffect(() => { fetchStreams(); }, []);

  const fetchStreams = async () => {
    const res = await fetch("/api/live");
    if (res.ok) setStreams(await res.json());
  };

  const fetchMessages = async (streamId: string) => {
    const url = `/api/live/messages?streamId=${streamId}${lastMsgTime.current ? `&after=${lastMsgTime.current}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const msgs: LiveMsg[] = await res.json();
      if (msgs.length > 0) {
        setMessages(prev => [...prev, ...msgs]);
        lastMsgTime.current = msgs[msgs.length - 1].createdAt;
      }
    }
  };

  const fetchViewerCount = async (streamId: string) => {
    const res = await fetch(`/api/live?streamId=${streamId}`);
    if (res.ok) {
      const data = await res.json();
      const stream = Array.isArray(data) ? data.find((s: LiveStream) => s.id === streamId) : data;
      if (stream) {
        setWatching(prev => prev ? { ...prev, viewers: stream.viewers } : prev);
        setStreaming(prev => prev ? { ...prev, viewers: stream.viewers } : prev);
      }
    }
  };

  const startPolling = (streamId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      await fetchMessages(streamId);
      await fetchViewerCount(streamId);
    }, 2000);
  };

  const watchStream = async (stream: LiveStream) => {
    setWatching(stream);
    setMessages([]);
    lastMsgTime.current = "";
    // Register as viewer
    await fetch("/api/live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id, action: "join" }) }).catch(() => {});
    await fetchMessages(stream.id);
    startPolling(stream.id);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { /* Camera access denied */ }
  };

  const goLive = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (res.ok) {
      const stream = await res.json();
      setStreaming(stream);
      setShowStart(false);
      setMessages([]);
      lastMsgTime.current = "";
      startPolling(stream.id);
      await startCamera();
    }
  };

  const endStream = async () => {
    if (!streaming) return;
    if (pollRef.current) clearInterval(pollRef.current);
    await fetch("/api/live/stream", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: streaming.id }) });
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
    }
    setStreaming(null);
    fetchStreams();
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !user) return;
    const streamId = watching?.id || streaming?.id;
    if (!streamId) return;
    await fetch("/api/live/messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId, text: msgText, username: user.username, avatar: user.avatar }) });
    setMsgText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Watching a stream
  if (watching) {
    return (
      <div className="flex flex-col h-screen" style={{ background: "#000" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => {
          setWatching(null);
          if (pollRef.current) clearInterval(pollRef.current);
          if (watching) fetch("/api/live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: watching.id, action: "leave" }) }).catch(() => {});
        }} className="text-white">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
              {watching.user.avatar ? <Image src={watching.user.avatar} alt="" width={32} height={32} className="object-cover" /> : <span className="text-white text-sm">{watching.user.username[0].toUpperCase()}</span>}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{watching.user.username}</p>
              <p className="text-red-400 text-xs">🔴 LIVE • {watching.viewers} viewers</p>
            </div>
          </div>
        </div>

        {/* Simulated stream visual */}
        <div className="flex-1 relative flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1b2d5b,#c9a84c)" }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📺</div>
            <p className="text-white font-bold text-xl">{watching.title}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
            <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
              {messages.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-yellow-300 text-sm font-semibold">{m.username}:</span>
                  <span className="text-white text-sm">{m.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Send a message..." className="flex-1 px-3 py-2 rounded-full text-sm text-white" style={{ background: "rgba(255,255,255,0.2)" }} />
              <button onClick={sendMessage} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "var(--gold)", color: "white" }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Your own stream
  if (streaming) {
    return (
      <div className="flex flex-col h-screen" style={{ background: "#000" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 px-2 py-0.5 rounded text-white text-xs font-bold">LIVE</div>
            <span className="text-white text-sm">{streaming.title}</span>
          </div>
          <button onClick={endStream} className="px-4 py-2 rounded-full text-sm font-semibold bg-red-500 text-white">End</button>
        </div>
        <video ref={videoRef} autoPlay muted className="w-full flex-1 object-cover" style={{ maxHeight: "60vh" }} />
        <div className="flex-1 p-4">
          <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
            {messages.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm font-semibold">{m.username}:</span>
                <span className="text-white text-sm">{m.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Reply..." className="flex-1 px-3 py-2 rounded-full text-sm text-white" style={{ background: "rgba(255,255,255,0.2)" }} />
            <button onClick={sendMessage} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "var(--gold)", color: "white" }}>Send</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Live</h1>
        {user && (
          <button onClick={() => setShowStart(true)} className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            + Go Live
          </button>
        )}
      </div>

      {showStart && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-6" style={{ background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--navy)" }}>Start Live Stream</h2>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stream title..."
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            <div className="flex gap-3">
              <button onClick={() => setShowStart(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>Cancel</button>
              <button onClick={goLive} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>Go Live 🔴</button>
            </div>
          </div>
        </div>
      )}

      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="text-6xl mb-4">📡</div>
          <p className="font-semibold text-lg mb-2" style={{ color: "var(--navy)" }}>No live streams right now</p>
          <p className="text-sm" style={{ color: "var(--gray-mid)" }}>Be the first to go live!</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-24">
          {streams.map(stream => (
            <button key={stream.id} onClick={() => watchStream(stream)} className="w-full rounded-2xl overflow-hidden text-left"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-32 flex items-center justify-center relative" style={{ background: "linear-gradient(135deg,var(--navy),var(--gold))" }}>
                <div className="text-4xl">📺</div>
                <div className="absolute top-3 left-3 bg-red-500 px-2 py-0.5 rounded text-white text-xs font-bold">LIVE</div>
                <div className="absolute top-3 right-3 bg-black/50 px-2 py-0.5 rounded text-white text-xs">{stream.viewers} 👁</div>
              </div>
              <div className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden" style={{ border: "2px solid var(--gold)" }}>
                  {stream.user.avatar ? <Image src={stream.user.avatar} alt="" width={36} height={36} className="object-cover" /> : <span className="text-sm font-bold" style={{ color: "var(--navy)" }}>{stream.user.username[0].toUpperCase()}</span>}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{stream.user.username}</p>
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{stream.title}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
