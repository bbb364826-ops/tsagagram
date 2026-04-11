"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentCode, setSentCode] = useState("");

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "შეცდომა"); }
    else { setSentCode(data._devCode || ""); setStep("code"); }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword: newPw }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "შეცდომა"); }
    else { setStep("done"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--navy)" }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            {step === "done" ? "პაროლი შეიცვალა!" : "პაროლის აღდგენა"}
          </h1>
        </div>

        {step === "email" && (
          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <p className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
              შეიყვანე Email მისამართი, კოდს გამოვაგზავნით
            </p>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} required />
            {error && <p className="text-sm text-center" style={{ color: "#e8534a" }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {loading ? "..." : "კოდის გაგზავნა"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleReset} className="flex flex-col gap-3">
            <p className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
              შეიყვანე 6-ნიშნა კოდი
              {sentCode && <span className="block mt-1 font-bold text-base" style={{ color: "var(--gold)" }}>
                (dev: {sentCode})
              </span>}
            </p>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center text-xl tracking-widest"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} autoFocus />
            <input type="password" placeholder="ახალი პაროლი (მინ. 6 სიმბოლო)" value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} />
            {error && <p className="text-sm text-center" style={{ color: "#e8534a" }}>{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6 || newPw.length < 6}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {loading ? "..." : "პაროლის შეცვლა"}
            </button>
            <button type="button" onClick={() => setStep("email")} className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
              უკან
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl">✅</div>
            <p className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
              პაროლი წარმატებით შეიცვალა!
            </p>
            <Link href="/login" className="w-full py-3 rounded-xl font-semibold text-white text-center"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              შესვლა
            </Link>
          </div>
        )}

        {step === "email" && (
          <p className="text-center text-sm mt-4" style={{ color: "var(--navy)" }}>
            <Link href="/login" style={{ color: "var(--gold)" }}>← შესვლა</Link>
          </p>
        )}
      </div>
    </div>
  );
}
