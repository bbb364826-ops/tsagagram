"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

type CallState = "connecting" | "ringing" | "active" | "ended";

export default function CallPage() {
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as "audio" | "video") || "audio";
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<CallState>("connecting");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [videoOn, setVideoOn] = useState(mode === "video");
  const [remoteUsername, setRemoteUsername] = useState(userId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalingRef = useRef<EventSource | null>(null);

  // Fetch callee info
  useEffect(() => {
    fetch(`/api/users/by-id/${userId}`).then(r => r.ok ? r.json() : null).then(u => {
      if (u?.username) setRemoteUsername(u.username);
    }).catch(() => {});
  }, [userId]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      // Simulate connection for demo (real signaling needs a server)
      setTimeout(() => {
        setState("active");
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }, 2000);

    } catch {
      setState("ended");
    }
  }, [mode]);

  useEffect(() => {
    setState("ringing");
    const timer = setTimeout(startCall, 1500);
    return () => clearTimeout(timer);
  }, [startCall]);

  const endCall = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    signalingRef.current?.close();
    setState("ended");
    setTimeout(() => router.back(), 1000);
  }, [router]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !videoOn; });
    setVideoOn(v => !v);
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (mode === "video") {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: "#1a1a2e" }}>
        {/* Remote video */}
        <div className="flex-1 relative">
          {state === "active" ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
                {remoteUsername[0]?.toUpperCase()}
              </div>
              <p className="text-white text-xl font-semibold">@{remoteUsername}</p>
              <p className="text-white/60 text-sm">
                {state === "connecting" ? "დაკავშირება..." : state === "ringing" ? "ზარი..." : "დასრულდა"}
              </p>
            </div>
          )}

          {/* Local video pip */}
          {videoOn && (
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}

          {/* Duration */}
          {state === "active" && (
            <div className="absolute top-4 left-4 bg-black/40 rounded-full px-3 py-1">
              <span className="text-white text-sm font-mono">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 py-8 px-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <button onClick={toggleMute} className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: muted ? "#e8534a" : "rgba(255,255,255,0.2)" }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              {muted
                ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>}
            </svg>
          </button>

          <button onClick={endCall} className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500">
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>

          <button onClick={toggleVideo} className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: !videoOn ? "#e8534a" : "rgba(255,255,255,0.2)" }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Audio call UI
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between py-16 px-8"
      style={{ background: "linear-gradient(180deg,var(--navy) 0%,#0d1b3e 100%)" }}>

      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="w-28 h-28 rounded-full flex items-center justify-center text-white text-5xl font-bold"
          style={{ background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.3)" }}>
          {remoteUsername[0]?.toUpperCase()}
        </div>
        <p className="text-white text-2xl font-bold">@{remoteUsername}</p>
        <p className="text-white/60 text-base">
          {state === "connecting" && "დაკავშირება..."}
          {state === "ringing" && "ზარი..."}
          {state === "active" && formatDuration(duration)}
          {state === "ended" && "დასრულდა"}
        </p>
        {state === "ringing" && (
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-12 w-full">
        <div className="flex flex-col items-center gap-2">
          <button onClick={toggleMute}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: muted ? "#e8534a" : "rgba(255,255,255,0.15)" }}>
            <svg width="26" height="26" fill="white" viewBox="0 0 24 24">
              {muted
                ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>}
            </svg>
          </button>
          <span className="text-white/60 text-xs">{muted ? "ჩართვა" : "გამორთვა"}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button onClick={endCall}
            className="w-18 h-18 w-20 h-20 rounded-full flex items-center justify-center bg-red-500 shadow-lg">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>
          <span className="text-white/60 text-xs">დასრულება</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button onClick={() => setSpeakerOn(s => !s)}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: speakerOn ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)" }}>
            <svg width="26" height="26" fill="white" viewBox="0 0 24 24">
              {speakerOn
                ? <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                : <path d="M16.5 12A4.5 4.5 0 0014 7.97V9.5l2.45 2.45c.03-.15.05-.31.05-.45zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0019.73 19L21 17.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>}
            </svg>
          </button>
          <span className="text-white/60 text-xs">{speakerOn ? "სპიკერი" : "ყურსასმენი"}</span>
        </div>
      </div>
    </div>
  );
}
