"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

type Step = "select" | "filter" | "details";
type AspectRatio = "1:1" | "4:5" | "16:9" | "original";
type ProductTagInput = { id: string; name: string; price: string; currency: string; url: string; x: number; y: number };

const FILTERS: { name: string; style: string }[] = [
  { name: "Normal", style: "" },
  { name: "Clarendon", style: "contrast(1.2) saturate(1.35)" },
  { name: "Gingham", style: "brightness(1.05) hue-rotate(-10deg)" },
  { name: "Moon", style: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Lark", style: "contrast(0.9) brightness(1.1) saturate(1.2)" },
  { name: "Reyes", style: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" },
  { name: "Juno", style: "saturate(1.4) contrast(1.05)" },
  { name: "Slumber", style: "saturate(0.66) brightness(1.05)" },
  { name: "Crema", style: "contrast(0.9) saturate(0.9) sepia(0.1)" },
  { name: "Ludwig", style: "brightness(1.05) contrast(1.05)" },
  { name: "Aden", style: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)" },
  { name: "Perpetua", style: "contrast(1.1) brightness(1.25) saturate(1.1)" },
  { name: "Amaro", style: "hue-rotate(-10deg) contrast(0.9) brightness(1.1) saturate(1.5)" },
  { name: "Mayfair", style: "contrast(1.1) saturate(1.1)" },
  { name: "Rise", style: "brightness(1.05) sepia(0.2) contrast(0.9) saturate(0.9)" },
  { name: "Hudson", style: "brightness(1.2) contrast(0.9) saturate(1.1)" },
  { name: "Valencia", style: "contrast(1.08) brightness(1.08) sepia(0.15)" },
  { name: "X-Pro II", style: "contrast(1.2) saturate(1.3) sepia(0.15)" },
  { name: "Walden", style: "brightness(1.1) sepia(0.35) saturate(0.8)" },
  { name: "Lo-Fi", style: "saturate(1.1) contrast(1.5)" },
  { name: "Earlybird", style: "sepia(0.2) contrast(0.9)" },
  { name: "Brannan", style: "sepia(0.5) contrast(1.4)" },
  { name: "Inkwell", style: "grayscale(1)" },
  { name: "Hefe", style: "contrast(1.5) saturate(1.5)" },
];

const RATIO_VALUES: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "16:9": "aspect-video",
  "original": "",
};

export default function Create() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("select");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [altText, setAltText] = useState("");
  const [disableComments, setDisableComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collabUser, setCollabUser] = useState<{ id: string; username: string; avatar?: string } | null>(null);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [showCollabSearch, setShowCollabSearch] = useState(false);
  const [paidPartnership, setPaidPartnership] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [productTags, setProductTags] = useState<ProductTagInput[]>([]);
  const [taggingMode, setTaggingMode] = useState(false);
  const [pendingTagPos, setPendingTagPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingTagForm, setPendingTagForm] = useState({ name: "", price: "", currency: "GEL", url: "" });
  const tagImageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  // Reel recording state
  const [showRecorder, setShowRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const recVideoRef = useRef<HTMLVideoElement>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showRecorder) startCameraPreview();
    else stopCameraPreview();
    return () => stopCameraPreview();
  }, [showRecorder, cameraFacing]);

  const startCameraPreview = async () => {
    stopCameraPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      recStreamRef.current = stream;
      if (recVideoRef.current) { recVideoRef.current.srcObject = stream; }
    } catch {}
  };

  const stopCameraPreview = () => {
    recStreamRef.current?.getTracks().forEach(t => t.stop());
    recStreamRef.current = null;
  };

  const startRecording = () => {
    if (!recStreamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(recStreamRef.current, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `reel_${Date.now()}.webm`, { type: "video/webm" });
      setShowRecorder(false);
      handleFiles([file]);
    };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setRecording(true);
    setRecordingTime(0);
    recTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  if (!user) { router.push("/login"); return null; }

  const handleFiles = (selected: File[]) => {
    const valid = selected.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/")).slice(0, 10);
    if (!valid.length) return;
    setFiles(valid);
    setPreviews(valid.map(f => URL.createObjectURL(f)));
    setActiveIdx(0);
    setStep("filter");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const addMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const combined = [...files, ...newFiles].slice(0, 10);
    setFiles(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (i: number) => {
    const newFiles = files.filter((_, idx) => idx !== i);
    const newPreviews = previews.filter((_, idx) => idx !== i);
    setFiles(newFiles);
    setPreviews(newPreviews);
    setActiveIdx(Math.min(activeIdx, newFiles.length - 1));
    if (!newFiles.length) setStep("select");
  };

  const handleShare = async () => {
    if (!files.length || loading) return;
    setLoading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "ფოტოს ატვირთვა ვერ მოხდა. სცადე ხელახლა.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }
      if (!urls.length) {
        alert("ფოტოს ატვირთვა ვერ მოხდა. სცადე ხელახლა.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: urls,
          caption,
          location,
          altText,
          disableComments,
          hideLikes,
          filter: filter.name !== "Normal" ? filter.name : undefined,
          collabUserId: collabUser?.id,
          paidPartnership,
          scheduledAt: scheduledAt || undefined,
          productTags: productTags.length ? productTags.map(t => ({ name: t.name, price: parseFloat(t.price) || 0, currency: t.currency, url: t.url || undefined, x: t.x, y: t.y })) : undefined,
        }),
      });
      if (res.ok) {
        const post = await res.json();
        if (scheduledAt) {
          router.push(`/u/${user.username}`);
        } else {
          router.push(`/p/${post.id}`);
        }
      } else {
        alert("პოსტის გამოქვეყნება ვერ მოხდა. სცადე ხელახლა.");
      }
    } catch {
      alert("კავშირის შეცდომა. ინტერნეტი შეამოწმე.");
    } finally {
      setLoading(false);
    }
  };

  const searchCollab = async (q: string) => {
    setCollabQuery(q);
    if (!q.trim()) { setCollabResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setCollabResults(await res.json());
  };

  const handleImageTagClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!taggingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingTagPos({ x, y });
    setPendingTagForm({ name: "", price: "", currency: "GEL", url: "" });
  };

  const confirmTag = () => {
    if (!pendingTagPos || !pendingTagForm.name.trim() || !pendingTagForm.price) return;
    setProductTags(prev => [...prev, { id: Math.random().toString(36).slice(2), ...pendingTagForm, x: pendingTagPos.x, y: pendingTagPos.y }]);
    setPendingTagPos(null);
    setTaggingMode(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > 50 && activeIdx < previews.length - 1) setActiveIdx(i => i + 1);
    if (dx < -50 && activeIdx > 0) setActiveIdx(i => i - 1);
  };

  // ─── REEL RECORDER ───────────────────────────────────────────────────────
  if (showRecorder) {
    const secs = recordingTime % 60;
    const mins = Math.floor(recordingTime / 60);
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
        <video ref={recVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: cameraFacing === "user" ? "scaleX(-1)" : "none" }} />
        {/* Top controls */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
          <button onClick={() => setShowRecorder(false)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2"/></svg>
          </button>
          {recording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "rgba(232,83,74,0.9)" }}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-bold">{mins.toString().padStart(2,"0")}:{secs.toString().padStart(2,"0")}</span>
            </div>
          )}
          <button onClick={() => { setCameraFacing(f => f === "user" ? "environment" : "user"); }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="white" strokeWidth="2" fill="none"/></svg>
          </button>
        </div>
        {/* Bottom controls */}
        <div className="relative z-10 mt-auto pb-16 flex flex-col items-center gap-4">
          <p className="text-white text-xs opacity-70">{recording ? "누르다" : "Press and hold to record"}</p>
          <button
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={e => { e.preventDefault(); startRecording(); }} onTouchEnd={stopRecording}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: recording ? "#e8534a" : "white", boxShadow: recording ? "0 0 0 6px rgba(232,83,74,0.4)" : "0 0 0 6px rgba(255,255,255,0.4)" }}>
            {recording
              ? <div className="w-8 h-8 rounded-md" style={{ background: "white" }} />
              : <div className="w-16 h-16 rounded-full" style={{ background: "#e8534a" }} />}
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 1: SELECT ───────────────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-[calc(100vh-112px)] flex flex-col" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span className="font-semibold text-sm" style={{ color: "var(--navy)" }}>ახალი პოსტი</span>
          <div className="w-6" />
        </div>

        <div
          className="flex-1 flex flex-col items-center justify-center px-8 py-12 cursor-pointer"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{ background: dragOver ? "var(--cream)" : undefined, transition: "background 0.2s" }}>

          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: dragOver ? "var(--gold)" : "var(--gray-light)" }}>
            <svg width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
              style={{ color: dragOver ? "white" : "var(--navy)" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
            {dragOver ? "გაანებე!" : "ფოტო ან ვიდეო"}
          </h2>
          <p className="text-sm text-center mb-8" style={{ color: "var(--gray-mid)" }}>
            {dragOver ? "ჩააგდე სურათები" : "ატვირთე ბიბლიოთეკიდან ან გადაიღე"}
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button className="w-full py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              ბიბლიოთეკიდან არჩევა
            </button>
            <button onClick={e => { e.stopPropagation(); setShowRecorder(true); }}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
              🎬 Reel-ის ჩაწერა
            </button>
            <button onClick={e => { e.stopPropagation(); router.push("/camera"); }}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
              📷 AR კამერა
            </button>
          </div>

          <p className="text-xs mt-6" style={{ color: "var(--gray-mid)" }}>
            გადაიტანე სურათი ან ვიდეო აქ (drag & drop)
          </p>
        </div>

        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleInputChange} />
      </div>
    );
  }

  // ─── STEP 2: FILTER ───────────────────────────────────────────────────────
  if (step === "filter") {
    const isVideo = files[activeIdx]?.type.startsWith("video/");
    const ratioClass = RATIO_VALUES[ratio];

    return (
      <div style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => { setStep("select"); setFiles([]); setPreviews([]); }} style={{ color: "var(--navy)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="font-semibold text-sm" style={{ color: "var(--navy)" }}>ფილტრი</span>
          <button onClick={() => setStep("details")} className="font-semibold text-sm" style={{ color: "var(--gold)" }}>
            შემდეგი →
          </button>
        </div>

        {/* Main preview */}
        <div className={`relative w-full bg-black overflow-hidden ${ratioClass || "aspect-square"}`}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {isVideo ? (
            <video src={previews[activeIdx]} className="w-full h-full object-cover" autoPlay muted loop playsInline
              style={{ filter: filter.style }} />
          ) : previews[activeIdx] ? (
            <div className="w-full h-full" style={{ filter: filter.style }}>
              <Image src={previews[activeIdx]} alt="preview" fill className="object-cover" unoptimized />
            </div>
          ) : null}

          {/* Carousel dots */}
          {previews.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {previews.map((_, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === activeIdx ? "6px" : "5px", height: i === activeIdx ? "6px" : "5px", background: i === activeIdx ? "white" : "rgba(255,255,255,0.6)" }} />
              ))}
            </div>
          )}

          {/* Counter */}
          {previews.length > 1 && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs text-white font-semibold"
              style={{ background: "rgba(0,0,0,0.5)" }}>{activeIdx + 1}/{previews.length}</div>
          )}

          {/* Delete button */}
          <button onClick={() => removeImage(activeIdx)}
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>

        {/* Aspect ratio bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "var(--border)", scrollbarWidth: "none" }}>
          {(["1:1", "4:5", "16:9", "original"] as AspectRatio[]).map(r => (
            <button key={r} onClick={() => setRatio(r)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: ratio === r ? "var(--navy)" : "var(--gray-light)",
                color: ratio === r ? "white" : "var(--gray-mid)"
              }}>
              {r === "original" ? "ორიგ." : r}
            </button>
          ))}
        </div>

        {/* Thumbnail strip with add button */}
        <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "var(--border)", scrollbarWidth: "none" }}>
          {previews.map((p, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className="relative flex-shrink-0 rounded-lg overflow-hidden"
              style={{ width: "60px", height: "60px", outline: i === activeIdx ? "2px solid var(--gold)" : "2px solid transparent" }}>
              <Image src={p} alt="" fill className="object-cover" unoptimized />
              {i === activeIdx && filter.style && (
                <div className="absolute inset-0" style={{ filter: filter.style, mixBlendMode: "multiply", background: "rgba(0,0,0,0.1)" }} />
              )}
            </button>
          ))}
          {previews.length < 10 && (
            <label className="flex-shrink-0 w-[60px] h-[60px] rounded-lg flex items-center justify-center cursor-pointer"
              style={{ background: "var(--gray-light)", border: "2px dashed var(--border)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}><path d="M12 5v14M5 12h14"/></svg>
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={addMore} />
            </label>
          )}
        </div>

        {/* Filters */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--gray-mid)" }}>ფილტრი</p>
        </div>
        <div className="flex gap-3 px-3 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(f => (
            <button key={f.name} onClick={() => setFilter(f)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-xl overflow-hidden relative"
                style={{ outline: filter.name === f.name ? "2.5px solid var(--gold)" : "2px solid transparent" }}>
                {previews[0] && (
                  <div className="w-full h-full" style={{ filter: f.style }}>
                    <Image src={previews[0]} alt={f.name} fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium" style={{ color: filter.name === f.name ? "var(--gold)" : "var(--gray-mid)" }}>
                {f.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 3: DETAILS ──────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <button onClick={() => setStep("filter")} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span className="font-semibold text-sm" style={{ color: "var(--navy)" }}>ახალი პოსტი</span>
        <button onClick={handleShare} disabled={loading}
          className="font-semibold text-sm disabled:opacity-40" style={{ color: "var(--gold)" }}>
          {loading ? "..." : "გამოქვეყნება"}
        </button>
      </div>

      {/* Preview + caption */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-start gap-3 p-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <Image src={previews[0]} alt="" fill className="object-cover" unoptimized style={{ filter: filter.style }} />
            {previews.length > 1 && (
              <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] text-white font-bold"
                style={{ background: "rgba(0,0,0,0.6)" }}>+{previews.length}</div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--navy)" }}>{user.username}</p>
            <textarea
              placeholder="წერე caption-ი... #hashtag @mention"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={4}
              maxLength={2200}
              className="w-full text-sm outline-none resize-none bg-transparent"
              style={{ color: "var(--navy)" }}
              autoFocus
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: "var(--gray-mid)" }}>
                {(caption.match(/#[\w\u10D0-\u10FF]+/g) || []).length} hashtag
              </span>
              <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{caption.length}/2200</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="mx-3 mt-2 rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)", flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <input type="text" placeholder="ლოკაციის დამატება" value={location}
            onChange={e => setLocation(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "var(--navy)" }} />
          {location && (
            <button onClick={() => setLocation("")} style={{ color: "var(--gray-mid)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Collab invite */}
      <div className="mx-3 mt-2 rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <button onClick={() => setShowCollabSearch(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-left" style={{ color: "var(--navy)" }}>
                {collabUser ? `Collab: @${collabUser.username}` : "Collab-ის მოწვევა"}
              </p>
              {!collabUser && <p className="text-xs text-left" style={{ color: "var(--gray-mid)" }}>ნომინირება თანამომხმარებელი</p>}
            </div>
          </div>
          {collabUser ? (
            <button onClick={e => { e.stopPropagation(); setCollabUser(null); setCollabQuery(""); }}
              style={{ color: "var(--gray-mid)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              style={{ color: "var(--gray-mid)", transform: showCollabSearch ? "rotate(180deg)" : undefined }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          )}
        </button>
        {showCollabSearch && !collabUser && (
          <div className="border-t px-4 pb-3" style={{ borderColor: "var(--border)" }}>
            <input type="text" placeholder="მოძებნე @username" value={collabQuery}
              onChange={e => searchCollab(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none mt-2"
              style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            {collabResults.map(u => (
              <button key={u.id} onClick={() => { setCollabUser(u); setShowCollabSearch(false); setCollabResults([]); }}
                className="flex items-center gap-3 py-2 w-full">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: "var(--navy)" }}>
                  {u.avatar ? <Image src={u.avatar} alt="" width={36} height={36} className="object-cover w-full h-full rounded-full" unoptimized /> : u.username[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Tags */}
      <div className="mx-3 mt-2 rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <button onClick={() => setTaggingMode(t => !t)}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-left" style={{ color: "var(--navy)" }}>
                {productTags.length > 0 ? `${productTags.length} პროდუქტი დათეგული` : "პროდუქტების მონიშვნა"}
              </p>
              <p className="text-xs text-left" style={{ color: "var(--gray-mid)" }}>მაღაზიის ტეგები სურათზე</p>
            </div>
          </div>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            style={{ color: "var(--gray-mid)", transform: taggingMode ? "rotate(180deg)" : undefined }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {taggingMode && (
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            {/* Tag image area */}
            <div ref={tagImageRef}
              className="relative w-full aspect-square cursor-crosshair overflow-hidden"
              onClick={handleImageTagClick}>
              {previews[0] && (
                <Image src={previews[0]} alt="" fill className="object-cover" unoptimized style={{ filter: filter.style }} />
              )}
              {/* Existing tags */}
              {productTags.map(t => (
                <div key={t.id} className="absolute" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)" }}>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white shadow-lg"
                    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}>
                    🏷️ {t.name}
                    <button onClick={e => { e.stopPropagation(); setProductTags(prev => prev.filter(x => x.id !== t.id)); }}
                      className="ml-1 opacity-70 hover:opacity-100">✕</button>
                  </div>
                </div>
              ))}
              {/* Pending tag */}
              {pendingTagPos && (
                <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-navy shadow-lg"
                  style={{ left: `${pendingTagPos.x}%`, top: `${pendingTagPos.y}%`, transform: "translate(-50%,-50%)", borderColor: "var(--navy)" }} />
              )}
              {/* Tap hint */}
              {!pendingTagPos && productTags.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "rgba(0,0,0,0.55)" }}>
                    სურათს დაეჭირე პროდუქტის მოსანიშნად
                  </div>
                </div>
              )}
            </div>

            {/* Tag form popup */}
            {pendingTagPos && (
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--navy)" }}>პროდუქტის ინფო</p>
                <input type="text" placeholder="სახელი (მაგ. Nike Air Max)" value={pendingTagForm.name}
                  onChange={e => setPendingTagForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                  style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
                <div className="flex gap-2 mb-2">
                  <input type="number" placeholder="ფასი" value={pendingTagForm.price}
                    onChange={e => setPendingTagForm(f => ({ ...f, price: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
                  <select value={pendingTagForm.currency}
                    onChange={e => setPendingTagForm(f => ({ ...f, currency: e.target.value }))}
                    className="px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                    <option>GEL</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
                <input type="url" placeholder="ლინკი (სურვილისამებრ)" value={pendingTagForm.url}
                  onChange={e => setPendingTagForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
                  style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
                <div className="flex gap-2">
                  <button onClick={confirmTag} disabled={!pendingTagForm.name.trim() || !pendingTagForm.price}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: "var(--navy)" }}>
                    დამატება
                  </button>
                  <button onClick={() => setPendingTagPos(null)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--gray-light)", color: "var(--gray-mid)" }}>
                    გაუქმება
                  </button>
                </div>
              </div>
            )}

            {productTags.length > 0 && !pendingTagPos && (
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--navy)" }}>დათეგული პროდუქტები</p>
                {productTags.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{t.name}</p>
                      <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{t.price} {t.currency}</p>
                    </div>
                    <button onClick={() => setProductTags(prev => prev.filter(x => x.id !== t.id))}
                      style={{ color: "#e8534a" }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced settings */}
      <div className="mx-3 mt-2 rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-medium" style={{ color: "var(--navy)" }}>გაფართოებული პარამეტრები</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            style={{ color: "var(--gray-mid)", transform: showAdvanced ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {showAdvanced && (
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            {/* Alt text */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--navy)" }}>Alt text (accessibility)</p>
              <textarea
                placeholder="სურათის აღწერა მხედველობადაქვეითებული ადამიანებისთვის..."
                value={altText}
                onChange={e => setAltText(e.target.value)}
                rows={2}
                maxLength={255}
                className="w-full text-sm outline-none resize-none rounded-lg px-3 py-2"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}
              />
            </div>

            {/* Disable comments */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>კომენტარების გამორთვა</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>ამ პოსტზე კომენტარები ვერ დაიწერება</p>
              </div>
              <button onClick={() => setDisableComments(d => !d)}
                className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: disableComments ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: disableComments ? "26px" : "2px" }} />
              </button>
            </div>

            {/* Hide likes */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>Like-ების დამალვა</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>სხვები ვერ ნახავენ like-ების რაოდენობას</p>
              </div>
              <button onClick={() => setHideLikes(h => !h)}
                className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: hideLikes ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: hideLikes ? "26px" : "2px" }} />
              </button>
            </div>

            {/* Paid partnership */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>Paid Partnership</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>ეს არის სპონსორი კონტენტი</p>
              </div>
              <button onClick={() => setPaidPartnership(p => !p)}
                className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: paidPartnership ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: paidPartnership ? "26px" : "2px" }} />
              </button>
            </div>

            {/* Schedule post */}
            <div className="px-4 py-3.5">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--navy)" }}>⏰ დაგეგმვა</p>
              <p className="text-xs mb-2" style={{ color: "var(--gray-mid)" }}>მომავალში გამოქვეყნება</p>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                min={new Date(Date.now() + 300000).toISOString().slice(0, 16)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--gray-light)", color: "var(--navy)", colorScheme: "light dark" }} />
              {scheduledAt && (
                <button onClick={() => setScheduledAt("")} className="mt-1 text-xs" style={{ color: "#e8534a" }}>
                  გაუქმება
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter used indicator */}
      {filter.name !== "Normal" && (
        <div className="mx-3 mt-2 px-4 py-2.5 rounded-xl flex items-center gap-2"
          style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--navy)" }}>ფილტრი: <span className="font-semibold">{filter.name}</span></span>
          <button onClick={() => setStep("filter")} className="ml-auto text-xs font-semibold" style={{ color: "var(--gold)" }}>შეცვლა</button>
        </div>
      )}

      {/* Share button */}
      <div className="mx-3 mt-4 mb-8">
        <button onClick={handleShare} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ატვირთვა...
            </span>
          ) : "გამოქვეყნება"}
        </button>
      </div>
    </div>
  );
}
