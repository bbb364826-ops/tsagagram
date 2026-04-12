"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

interface LiveStream {
  id: string; title: string; viewers: number; createdAt: string;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
}
interface LiveMsg { id: string; text: string; username: string; avatar?: string; createdAt: string; }
interface ViewerSignal { id: string; viewerId: string; offer?: string; answer?: string; streamerIce: string; viewerIce: string; status: string; }

// ─── STREAMER COMPONENT ───────────────────────────────────────────────────────
function StreamerView({ stream, onEnd }: { stream: LiveStream; onEnd: () => void }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const sentIceRef = useRef<Record<string, Set<string>>>({});
  const processedViewers = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [msgText, setMsgText] = useState("");
  const [camError, setCamError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTime = useRef("");

  useEffect(() => {
    startCamera();
    startSignalingPoll();
    startMsgPoll();
    return () => {
      stopAll();
    };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; }
    } catch { setCamError(true); }
  };

  const startMsgPoll = () => {
    const fetchMsgs = async () => {
      const url = `/api/live/messages?streamId=${stream.id}${lastMsgTime.current ? `&after=${lastMsgTime.current}` : ""}`;
      const res = await fetch(url).catch(() => null);
      if (!res?.ok) return;
      const msgs: LiveMsg[] = await res.json();
      if (msgs.length > 0) {
        setMessages(prev => [...prev, ...msgs]);
        lastMsgTime.current = msgs[msgs.length - 1].createdAt;
      }
    };
    fetchMsgs();
    msgPollRef.current = setInterval(fetchMsgs, 2000);
  };

  const startSignalingPoll = () => {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/live/signal?streamId=${stream.id}&role=streamer`).catch(() => null);
      if (!res?.ok) return;
      const signals: ViewerSignal[] = await res.json();

      for (const sig of signals) {
        if (sig.status === "ended") continue;

        // New viewer: create offer
        if (!processedViewers.current.has(sig.viewerId) && !sig.offer) {
          processedViewers.current.add(sig.viewerId);
          await createOfferForViewer(sig.viewerId, stream.id);
        }

        // Viewer sent answer: apply it
        const pc = pcsRef.current[sig.viewerId];
        if (pc && sig.answer && pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(JSON.parse(sig.answer));
          } catch {}
        }

        // Apply viewer ICE candidates
        if (pc && sig.viewerIce) {
          const candidates = JSON.parse(sig.viewerIce) as RTCIceCandidateInit[];
          const sent = sentIceRef.current[sig.viewerId] || new Set<string>();
          for (const c of candidates) {
            const key = JSON.stringify(c);
            if (!sent.has(key)) {
              sent.add(key);
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
          }
          sentIceRef.current[sig.viewerId] = sent;
        }
      }
    }, 1500);
  };

  const createOfferForViewer = async (viewerId: string, streamId: string) => {
    if (!localStreamRef.current) return;
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcsRef.current[viewerId] = pc;
    sentIceRef.current[viewerId] = new Set();

    localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    const iceBatch: RTCIceCandidate[] = [];
    pc.onicecandidate = (e) => {
      if (e.candidate) iceBatch.push(e.candidate);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete (max 2s)
    await new Promise<void>(resolve => {
      const timeout = setTimeout(resolve, 2000);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") { clearTimeout(timeout); resolve(); }
      };
    });

    // Send offer with gathered ICE candidates
    await fetch(`/api/live/signal/${viewerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId, offer: JSON.stringify(pc.localDescription) }),
    }).catch(() => {});

    // Send ICE candidates
    for (const c of iceBatch) {
      await fetch(`/api/live/signal/${viewerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId, streamerIce: c.toJSON() }),
      }).catch(() => {});
    }
  };

  const stopAll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    Object.values(pcsRef.current).forEach(pc => pc.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const endStream = async () => {
    stopAll();
    await fetch("/api/live/stream", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id }) }).catch(() => {});
    onEnd();
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !user) return;
    await fetch("/api/live/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id, text: msgText, username: user.username, avatar: user.avatar }) });
    setMsgText("");
  };

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#000" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-red-500 px-2 py-0.5 rounded text-white text-xs font-bold animate-pulse">LIVE</div>
          <span className="text-white text-sm font-semibold">{stream.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-xs opacity-70">{stream.viewers} 👁</span>
          <button onClick={endStream} className="px-4 py-2 rounded-full text-sm font-semibold bg-red-500 text-white">End</button>
        </div>
      </div>

      {camError ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <p className="text-white text-lg">📷 Camera access denied</p>
          <p className="text-gray-400 text-sm">Please allow camera access and try again</p>
        </div>
      ) : (
        <video ref={videoRef} autoPlay muted playsInline className="w-full object-cover"
          style={{ flex: 1, maxHeight: "calc(100vh - 180px)" }} />
      )}

      <div className="flex-shrink-0 p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
        <div className="max-h-28 overflow-y-auto space-y-1 mb-2">
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
            placeholder="Say something..." className="flex-1 px-3 py-2 rounded-full text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.15)" }} />
          <button onClick={sendMessage} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "var(--gold)", color: "white" }}>
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VIEWER COMPONENT ─────────────────────────────────────────────────────────
function ViewerView({ stream, onLeave }: { stream: LiveStream; onLeave: () => void }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sentIceRef = useRef<Set<string>>(new Set());
  const signalIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [msgText, setMsgText] = useState("");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(stream.viewers);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTime = useRef("");

  useEffect(() => {
    joinStream();
    return () => { leaveStream(); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const joinStream = async () => {
    // Register as viewer
    await fetch("/api/live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id, action: "join" }) }).catch(() => {});

    // Create signal record
    const sigRes = await fetch("/api/live/signal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId: stream.id }),
    }).catch(() => null);
    if (sigRes?.ok) {
      const sig = await sigRes.json();
      signalIdRef.current = sig.id;
    }

    startMsgPoll();
    startSignalingPoll();
  };

  const startMsgPoll = () => {
    const fetchMsgs = async () => {
      const url = `/api/live/messages?streamId=${stream.id}${lastMsgTime.current ? `&after=${lastMsgTime.current}` : ""}`;
      const res = await fetch(url).catch(() => null);
      if (!res?.ok) return;
      const msgs: LiveMsg[] = await res.json();
      if (msgs.length > 0) {
        setMessages(prev => [...prev, ...msgs]);
        lastMsgTime.current = msgs[msgs.length - 1].createdAt;
      }
      // Update viewer count
      const countRes = await fetch(`/api/live?streamId=${stream.id}`).catch(() => null);
      if (countRes?.ok) {
        const data = await countRes.json();
        const s = Array.isArray(data) ? data.find((x: LiveStream) => x.id === stream.id) : data;
        if (s?.viewers) setViewers(s.viewers);
      }
    };
    fetchMsgs();
    msgPollRef.current = setInterval(fetchMsgs, 2000);
  };

  const startSignalingPoll = () => {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/live/signal?streamId=${stream.id}&role=viewer`).catch(() => null);
      if (!res?.ok) return;
      const sig: ViewerSignal | null = await res.json();
      if (!sig) return;

      // Got offer from streamer: set up WebRTC
      if (sig.offer && !pcRef.current) {
        await setupPeerConnection(sig);
      }

      // Apply streamer ICE candidates
      if (pcRef.current && sig.streamerIce) {
        const candidates = JSON.parse(sig.streamerIce) as RTCIceCandidateInit[];
        for (const c of candidates) {
          const key = JSON.stringify(c);
          if (!sentIceRef.current.has(key)) {
            sentIceRef.current.add(key);
            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
        }
      }
    }, 1500);
  };

  const setupPeerConnection = async (sig: ViewerSignal) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current && e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setConnected(true);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") setConnected(false);
    };

    const iceBatch: RTCIceCandidate[] = [];
    pc.onicecandidate = (e) => {
      if (e.candidate) iceBatch.push(e.candidate);
    };

    await pc.setRemoteDescription(JSON.parse(sig.offer!));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise<void>(resolve => {
      const timeout = setTimeout(resolve, 2000);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") { clearTimeout(timeout); resolve(); }
      };
    });

    // Send answer
    await fetch(`/api/live/signal/${sig.viewerId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId: stream.id, answer: JSON.stringify(pc.localDescription) }),
    }).catch(() => {});

    // Send viewer ICE candidates
    for (const c of iceBatch) {
      await fetch(`/api/live/signal/${sig.viewerId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id, viewerIce: c.toJSON() }),
      }).catch(() => {});
    }
  };

  const leaveStream = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    pcRef.current?.close();
    fetch("/api/live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id, action: "leave" }) }).catch(() => {});
    if (signalIdRef.current) {
      fetch(`/api/live/signal/${user?.id}?streamId=${stream.id}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !user) return;
    await fetch("/api/live/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: stream.id, text: msgText, username: user.username, avatar: user.avatar }) });
    setMsgText("");
  };

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#000" }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={() => { leaveStream(); onLeave(); }} className="text-white">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {stream.user.avatar
              ? <Image src={stream.user.avatar} alt="" width={32} height={32} className="object-cover" unoptimized />
              : <span className="text-white text-sm">{stream.user.username[0].toUpperCase()}</span>}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{stream.user.username}</p>
            <p className="text-red-400 text-xs">🔴 LIVE · {viewers} viewers</p>
          </div>
        </div>
        {connected && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-400 text-xs">HD</span>
          </div>
        )}
      </div>

      <div className="relative flex-1 flex items-center justify-center" style={{ background: "#111" }}>
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 animate-spin mb-4" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
            <p className="text-white text-sm">Connecting to stream...</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
          <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
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
              placeholder="Send a message..." className="flex-1 px-3 py-2 rounded-full text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.2)" }} />
            <button onClick={sendMessage} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "var(--gold)", color: "white" }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LivePage() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [watching, setWatching] = useState<LiveStream | null>(null);
  const [streaming, setStreaming] = useState<LiveStream | null>(null);
  const [title, setTitle] = useState("");
  const [showStart, setShowStart] = useState(false);

  useEffect(() => { fetchStreams(); }, []);

  const fetchStreams = async () => {
    const res = await fetch("/api/live");
    if (res.ok) setStreams(await res.json());
  };

  const goLive = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (res.ok) {
      const stream = await res.json();
      setStreaming(stream);
      setShowStart(false);
    }
  };

  if (watching) return <ViewerView stream={watching} onLeave={() => { setWatching(null); fetchStreams(); }} />;
  if (streaming) return <StreamerView stream={streaming} onEnd={() => { setStreaming(null); fetchStreams(); }} />;

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Live</h1>
        {user && (
          <button onClick={() => setShowStart(true)}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            + Go Live
          </button>
        )}
      </div>

      {showStart && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-6" style={{ background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--navy)" }}>Start Live Stream</h2>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stream title..."
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }} />
            <div className="flex gap-3">
              <button onClick={() => setShowStart(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                Cancel
              </button>
              <button onClick={goLive} disabled={!title.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                Go Live 🔴
              </button>
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
            <button key={stream.id} onClick={() => setWatching(stream)}
              className="w-full rounded-2xl overflow-hidden text-left"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-32 flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg,var(--navy),var(--gold))" }}>
                {stream.user.avatar
                  ? <Image src={stream.user.avatar} alt="" fill className="object-cover opacity-40" unoptimized />
                  : null}
                <div className="text-5xl relative z-10">📺</div>
                <div className="absolute top-3 left-3 bg-red-500 px-2 py-0.5 rounded text-white text-xs font-bold">LIVE</div>
                <div className="absolute top-3 right-3 bg-black/50 px-2 py-0.5 rounded text-white text-xs">{stream.viewers} 👁</div>
              </div>
              <div className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ border: "2px solid var(--gold)", background: "var(--navy)" }}>
                  {stream.user.avatar
                    ? <Image src={stream.user.avatar} alt="" width={36} height={36} className="object-cover" unoptimized />
                    : <span className="text-sm font-bold text-white">{stream.user.username[0].toUpperCase()}</span>}
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
