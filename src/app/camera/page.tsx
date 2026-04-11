"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

const FILTERS = [
  { name: "None", css: "none", label: "Original" },
  { name: "Clarendon", css: "contrast(1.2) saturate(1.35) brightness(1.05)", label: "Clarendon" },
  { name: "Gingham", css: "sepia(0.15) contrast(0.9) brightness(1.1) hue-rotate(-10deg)", label: "Gingham" },
  { name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.15)", label: "Moon" },
  { name: "Lark", css: "contrast(0.9) brightness(1.2) saturate(1.5)", label: "Lark" },
  { name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)", label: "Reyes" },
  { name: "Juno", css: "saturate(1.4) contrast(1.05) brightness(1.0) hue-rotate(-5deg)", label: "Juno" },
  { name: "Slumber", css: "saturate(0.66) brightness(1.05)", label: "Slumber" },
  { name: "Crema", css: "sepia(0.15) contrast(0.85) brightness(1.15) saturate(0.9)", label: "Crema" },
  { name: "Ludwig", css: "contrast(1.05) brightness(1.05) saturate(1.3) sepia(0.1)", label: "Ludwig" },
  { name: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)", label: "Aden" },
  { name: "Perpetua", css: "contrast(1.1) brightness(1.25) saturate(1.1)", label: "Perpetua" },
];

const STICKERS = ["🌟", "❤️", "🔥", "😍", "✨", "🌈", "🎉", "💫", "🌸", "😎", "🦋", "🌺"];

interface Sticker { id: number; emoji: string; x: number; y: number; type?: "emoji" | "music" | "url" | "poll" | "question" | "countdown" | "slider" | "addyours"; text?: string; question?: string; options?: string[]; endDate?: string; }

export default function CameraPage() {
  const { user } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showStickerTypes, setShowStickerTypes] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpts, setPollOpts] = useState(["კი", "არა"]);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [showCountdownInput, setShowCountdownInput] = useState(false);
  const [countdownDate, setCountdownDate] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("");
  const [forClose, setForClose] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [facing]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
    } catch { /* denied */ }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = filter.css;
    ctx.drawImage(video, 0, 0);
    ctx.filter = "none";
    stickers.forEach(s => {
      ctx.font = `${Math.min(canvas.width, canvas.height) * 0.08}px serif`;
      ctx.fillText(s.emoji, s.x * canvas.width, s.y * canvas.height);
    });
    setCaptured(canvas.toDataURL("image/jpeg", 0.9));
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    videoChunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: mimeType });
      setCapturedVideo(blob);
      setCapturedVideoUrl(URL.createObjectURL(blob));
      setRecording(false);
      setRecordSeconds(0);
    };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds(s => {
      if (s >= 59) { stopRecording(); return s; }
      return s + 1;
    }), 1000);
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
  };

  const retake = () => {
    setCaptured(null);
    if (capturedVideoUrl) { URL.revokeObjectURL(capturedVideoUrl); }
    setCapturedVideo(null);
    setCapturedVideoUrl(null);
    startCamera();
  };

  const uploadCaptured = async (): Promise<string | null> => {
    if (!captured) return null;
    const blob = await (await fetch(captured)).blob();
    const formData = new FormData();
    formData.append("file", blob, "camera.jpg");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!capturedVideo) return null;
    const formData = new FormData();
    formData.append("file", capturedVideo, "camera.webm");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const usePhoto = async () => {
    if (!captured || !user) return;
    setUploading(true);
    try {
      const url = await uploadCaptured();
      if (url) router.push(`/create?image=${encodeURIComponent(url)}`);
    } finally { setUploading(false); }
  };

  const useVideo = async () => {
    if (!capturedVideo || !user) return;
    setUploading(true);
    try {
      const url = await uploadVideo();
      if (url) router.push(`/create?image=${encodeURIComponent(url)}`);
    } finally { setUploading(false); }
  };

  const addToStory = async () => {
    if ((!captured && !capturedVideo) || !user) return;
    setUploading(true);
    try {
      let url: string | null = null;
      let mediaType = "image";
      if (capturedVideo) { url = await uploadVideo(); mediaType = "video"; }
      else { url = await uploadCaptured(); }
      if (!url) return;
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media: url,
          mediaType,
          forClose,
          stickers: stickers.length ? JSON.stringify(stickers) : undefined,
        }),
      });
      if (res.ok) router.push("/");
    } finally { setUploading(false); }
  };

  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, { id: Date.now(), emoji, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, type: "emoji" }]);
    setShowStickers(false);
  };

  const addMusicSticker = () => {
    const label = `🎵 Original Audio · @${user?.username || "user"}`;
    setStickers(prev => [...prev, { id: Date.now(), emoji: label, x: 0.1, y: 0.75, type: "music", text: label }]);
    setShowStickerTypes(false);
  };

  const addUrlSticker = () => {
    if (!urlInput.trim()) return;
    setStickers(prev => [...prev, { id: Date.now(), emoji: `🔗 ${urlInput}`, x: 0.1, y: 0.4, type: "url", text: urlInput }]);
    setUrlInput(""); setShowUrlInput(false); setShowStickerTypes(false);
  };

  const addPollSticker = () => {
    if (!pollQuestion.trim()) return;
    setStickers(prev => [...prev, { id: Date.now(), emoji: "📊", x: 0.1, y: 0.45, type: "poll", question: pollQuestion, options: pollOpts.filter(Boolean) }]);
    setPollQuestion(""); setPollOpts(["კი", "არა"]); setShowPollInput(false);
  };

  const addQuestionSticker = () => {
    if (!questionText.trim()) return;
    setStickers(prev => [...prev, { id: Date.now(), emoji: "💬", x: 0.1, y: 0.4, type: "question", question: questionText }]);
    setQuestionText(""); setShowQuestionInput(false);
  };

  const addCountdownSticker = () => {
    if (!countdownDate) return;
    setStickers(prev => [...prev, { id: Date.now(), emoji: "⏳", x: 0.1, y: 0.35, type: "countdown", endDate: countdownDate, text: countdownLabel || "Countdown" }]);
    setCountdownDate(""); setCountdownLabel(""); setShowCountdownInput(false);
  };

  const addSliderSticker = () => {
    setStickers(prev => [...prev, { id: Date.now(), emoji: "😍", x: 0.1, y: 0.55, type: "slider", question: "გამოხატე განწყობა" }]);
    setShowStickerTypes(false);
  };

  const addAddYoursSticker = () => {
    setStickers(prev => [...prev, { id: Date.now(), emoji: "➕", x: 0.1, y: 0.4, type: "addyours", question: "Add Yours" }]);
    setShowStickerTypes(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#000" }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <button onClick={() => router.back()} className="text-white p-2">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        {!captured && (
          <button onClick={() => setFacing(f => f === "user" ? "environment" : "user")} className="text-white p-2">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        )}
        {!captured && (
          <div className="flex items-center gap-2">
            <button onClick={() => setForClose(f => !f)}
              className="px-2 py-1 rounded-full text-xs font-semibold"
              style={{ background: forClose ? "#22c55e" : "rgba(255,255,255,0.2)", color: "white" }}>
              {forClose ? "👥 Close" : "👥"}
            </button>
            <button onClick={() => setShowStickerTypes(s => !s)} className="text-white p-2 text-xl">🌟</button>
          </div>
        )}
      </div>

      {/* Camera / Captured */}
      <div className="flex-1 relative overflow-hidden">
        {!captured && !capturedVideoUrl ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"
              style={{ filter: filter.css, transform: facing === "user" ? "scaleX(-1)" : "none" }} />
            {stickers.map(s => (
              <div key={s.id} className="absolute text-3xl pointer-events-none" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%,-50%)" }}>
                {s.emoji}
              </div>
            ))}
            {recording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-sm font-semibold">{recordSeconds}s / 60s</span>
              </div>
            )}
          </>
        ) : capturedVideoUrl ? (
          <video src={capturedVideoUrl} className="w-full h-full object-cover" controls playsInline />
        ) : (
          <img src={captured!} alt="Captured" className="w-full h-full object-cover" />
        )}

        {/* Sticker type picker */}
        {showStickerTypes && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <div className="rounded-2xl p-3" style={{ background: "rgba(0,0,0,0.85)" }}>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                { emoji: "😊", label: "Sticker", action: () => { setShowStickerTypes(false); setShowStickers(true); } },
                { emoji: "🎵", label: "Music", action: addMusicSticker },
                { emoji: "🔗", label: "Link", action: () => { setShowUrlInput(true); setShowStickerTypes(false); } },
                { emoji: "📊", label: "Poll", action: () => { setShowPollInput(true); setShowStickerTypes(false); } },
                { emoji: "💬", label: "Question", action: () => { setShowQuestionInput(true); setShowStickerTypes(false); } },
                { emoji: "⏳", label: "Countdown", action: () => { setShowCountdownInput(true); setShowStickerTypes(false); } },
                { emoji: "😍", label: "Slider", action: addSliderSticker },
                { emoji: "➕", label: "Add Yours", action: addAddYoursSticker },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-white text-xs">{item.label}</span>
                </button>
              ))}
              </div>
              <button onClick={() => setShowStickerTypes(false)} className="w-full text-center text-white/60 text-xs py-1">
                დახურვა
              </button>
            </div>
          </div>
        )}

        {/* URL sticker input */}
        {showUrlInput && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
              <p className="text-white text-sm font-semibold mb-2">ლინკის სტიკერი</p>
              <input type="url" placeholder="https://..." value={urlInput} onChange={e => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowUrlInput(false)} className="flex-1 py-2 rounded-xl text-sm text-white/60">გაუქმება</button>
                <button onClick={addUrlSticker} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--gold)" }}>დამატება</button>
              </div>
            </div>
          </div>
        )}

        {/* Poll sticker input */}
        {showPollInput && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
              <p className="text-white text-sm font-semibold mb-2">📊 კენჭისყრა</p>
              <input type="text" placeholder="კითხვა..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }} autoFocus />
              {pollOpts.map((opt, i) => (
                <input key={i} type="text" placeholder={`ვარიანტი ${i + 1}`} value={opt}
                  onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white" }} />
              ))}
              <div className="flex gap-2">
                <button onClick={() => setShowPollInput(false)} className="flex-1 py-2 rounded-xl text-sm text-white/60">გაუქმება</button>
                <button onClick={addPollSticker} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>დამატება</button>
              </div>
            </div>
          </div>
        )}

        {/* Question sticker input */}
        {showQuestionInput && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
              <p className="text-white text-sm font-semibold mb-2">💬 კითხვა</p>
              <input type="text" placeholder="დასვი კითხვა..." value={questionText} onChange={e => setQuestionText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }} autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowQuestionInput(false)} className="flex-1 py-2 rounded-xl text-sm text-white/60">გაუქმება</button>
                <button onClick={addQuestionSticker} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>დამატება</button>
              </div>
            </div>
          </div>
        )}

        {/* Countdown sticker input */}
        {showCountdownInput && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
              <p className="text-white text-sm font-semibold mb-2">⏳ Countdown</p>
              <input type="text" placeholder="სახელი (მაგ: დაბადების დღე)" value={countdownLabel} onChange={e => setCountdownLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }} autoFocus />
              <input type="datetime-local" value={countdownDate} onChange={e => setCountdownDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", colorScheme: "dark" }} />
              <div className="flex gap-2">
                <button onClick={() => setShowCountdownInput(false)} className="flex-1 py-2 rounded-xl text-sm text-white/60">გაუქმება</button>
                <button onClick={addCountdownSticker} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>დამატება</button>
              </div>
            </div>
          </div>
        )}

        {/* Emoji sticker picker */}
        {showStickers && (
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="rounded-2xl p-3 flex flex-wrap gap-2 justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
              {STICKERS.map(emoji => (
                <button key={emoji} onClick={() => addSticker(emoji)} className="text-3xl">{emoji}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter strip */}
      {!captured && (
        <div className="overflow-x-auto pb-2 pt-2" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3 px-4">
            {FILTERS.map(f => (
              <button key={f.name} onClick={() => setFilter(f)}
                className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden" style={{ border: filter.name === f.name ? "2px solid var(--gold)" : "2px solid transparent" }}>
                  <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#c9a84c,#1b2d5b)", filter: f.css }} />
                </div>
                <span className="text-white text-xs">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode switcher */}
      {!captured && !capturedVideoUrl && (
        <div className="flex items-center justify-center gap-6 pt-3 pb-1">
          <button onClick={() => setMode("photo")}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{ background: mode === "photo" ? "white" : "rgba(255,255,255,0.2)", color: mode === "photo" ? "#000" : "white" }}>
            ფოტო
          </button>
          <button onClick={() => setMode("video")}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{ background: mode === "video" ? "#e8534a" : "rgba(255,255,255,0.2)", color: "white" }}>
            ვიდეო
          </button>
        </div>
      )}

      {/* Capture button */}
      <div className="flex items-center justify-center py-6 gap-8">
        {(captured || capturedVideoUrl) ? (
          <div className="flex flex-col items-center gap-3 w-full px-6">
            <div className="flex gap-3 w-full">
              <button onClick={retake} className="flex-1 py-3 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Retake</button>
              <button onClick={addToStory} disabled={uploading} className="flex-1 py-3 rounded-full font-semibold text-white" style={{ background: "linear-gradient(135deg,#e8534a,#c9a84c)" }}>
                {uploading ? "..." : "Add to Story"}
              </button>
            </div>
            <button onClick={capturedVideoUrl ? useVideo : usePhoto} disabled={uploading} className="w-full py-3 rounded-full font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {uploading ? "Uploading..." : "Use as Post"}
            </button>
          </div>
        ) : mode === "photo" ? (
          <button onClick={capture} className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "white", boxShadow: "0 0 0 4px rgba(255,255,255,0.3)" }}>
            <div className="w-16 h-16 rounded-full" style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }} />
          </button>
        ) : (
          <button
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ background: recording ? "#e8534a" : "white", boxShadow: `0 0 0 4px ${recording ? "rgba(232,83,74,0.4)" : "rgba(255,255,255,0.3)"}` }}>
            {recording
              ? <div className="w-8 h-8 rounded-sm bg-white" />
              : <div className="w-16 h-16 rounded-full bg-red-500" />}
          </button>
        )}
      </div>
    </div>
  );
}
