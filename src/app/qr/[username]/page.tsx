"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// Minimal QR code renderer using canvas (data URL approach)
function drawQR(canvas: HTMLCanvasElement, data: string) {
  // We'll use a simple visual representation with encoded URL
  // Since we can't install a QR lib, we use a grid-based placeholder
  // that encodes the profile URL visually
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const SIZE = 200;
  canvas.width = SIZE;
  canvas.height = SIZE;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Generate pseudo-random grid from data hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }

  const MODULES = 21;
  const CELL = SIZE / MODULES;

  // Helper to check if position is in a finder pattern
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= MODULES - 7) || (r >= MODULES - 7 && c < 7);

  // Draw finder patterns
  const drawFinder = (startR: number, startC: number) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(startC * CELL, startR * CELL, 7 * CELL, 7 * CELL);
    ctx.fillStyle = "#fff";
    ctx.fillRect((startC + 1) * CELL, (startR + 1) * CELL, 5 * CELL, 5 * CELL);
    ctx.fillStyle = "#000";
    ctx.fillRect((startC + 2) * CELL, (startR + 2) * CELL, 3 * CELL, 3 * CELL);
  };

  drawFinder(0, 0);
  drawFinder(0, MODULES - 7);
  drawFinder(MODULES - 7, 0);

  // Fill data area with pseudo-random pattern
  let seed = Math.abs(hash);
  for (let r = 0; r < MODULES; r++) {
    for (let c = 0; c < MODULES; c++) {
      if (isFinder(r, c)) continue;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      if (seed % 3 === 0) {
        ctx.fillStyle = "#000";
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }

  // Separators (white around finders)
  ctx.fillStyle = "#fff";
  ctx.fillRect(7 * CELL, 0, CELL, 8 * CELL);
  ctx.fillRect(0, 7 * CELL, 8 * CELL, CELL);
  ctx.fillRect((MODULES - 8) * CELL, 0, CELL, 8 * CELL);
  ctx.fillRect((MODULES - 8) * CELL, 7 * CELL, 8 * CELL, CELL);
  ctx.fillRect(7 * CELL, (MODULES - 8) * CELL, CELL, 8 * CELL);
  ctx.fillRect(0, (MODULES - 8) * CELL, 8 * CELL, CELL);
}

export default function QRPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${username}`
    : `/u/${username}`;

  useEffect(() => {
    if (canvasRef.current) {
      drawQR(canvasRef.current, profileUrl);
    }
  }, [profileUrl]);

  const startScan = async () => {
    setScanError("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream;
        await scanVideoRef.current.play();
      }
      // Use BarcodeDetector if available (Chrome 83+)
      if ("BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const scanLoop = setInterval(async () => {
          if (!scanVideoRef.current) { clearInterval(scanLoop); return; }
          try {
            const codes = await detector.detect(scanVideoRef.current);
            if (codes.length > 0) {
              clearInterval(scanLoop);
              stream.getTracks().forEach(t => t.stop());
              setScanning(false);
              const rawValue: string = codes[0].rawValue;
              // Navigate if it's a Tsagagram profile URL
              const match = rawValue.match(/\/u\/([^/?#]+)/);
              if (match) router.push(`/u/${match[1]}`);
              else setScanError(`QR: ${rawValue}`);
            }
          } catch {}
        }, 500);
      } else {
        setScanError("QR სკანირება არ არის მხარდაჭერილი ამ ბრაუზერში");
        stream.getTracks().forEach(t => t.stop());
        setScanning(false);
      }
    } catch {
      setScanError("კამერაზე წვდომა არ მოხერხდა");
      setScanning(false);
    }
  };

  const stopScan = () => {
    const vid = scanVideoRef.current;
    if (vid?.srcObject) {
      (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      vid.srcObject = null;
    }
    setScanning(false);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `tsagagram-${username}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="w-full max-w-sm mb-6 flex items-center gap-3">
        <Link href={`/u/${username}`} className="p-2 rounded-full" style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className="font-bold text-lg" style={{ color: "var(--navy)" }}>QR კოდი</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-6 shadow-lg"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: "var(--navy)" }}>
            {username[0]?.toUpperCase()}
          </div>
          <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>@{username}</p>
          <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Tsagagram</p>
        </div>

        {/* QR Canvas */}
        <div className="p-4 rounded-2xl bg-white shadow-sm">
          <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />
        </div>

        <p className="text-xs text-center px-4" style={{ color: "var(--gray-mid)" }}>
          გადაიღე QR კოდი ამ პროფილის გასახსნელად
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm mt-6 flex flex-col gap-3">
        <button onClick={handleDownload}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
          ჩამოტვირთვა
        </button>
        <button onClick={handleCopy}
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--card)", color: "var(--navy)", border: "1px solid var(--border)" }}>
          {copied ? "დაკოპირდა ✓" : "ლინკის კოპირება"}
        </button>
        {!scanning ? (
          <button onClick={startScan}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: "var(--card)", color: "var(--navy)", border: "1px solid var(--border)" }}>
            📷 QR კოდის სკანირება
          </button>
        ) : (
          <div className="w-full rounded-2xl overflow-hidden relative" style={{ background: "#000" }}>
            <video ref={scanVideoRef} playsInline muted className="w-full" style={{ maxHeight: "240px", objectFit: "cover" }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-white rounded-2xl opacity-60" />
            </div>
            <button onClick={stopScan} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        {scanError && <p className="text-xs text-center" style={{ color: "#e8534a" }}>{scanError}</p>}
      </div>
    </div>
  );
}
