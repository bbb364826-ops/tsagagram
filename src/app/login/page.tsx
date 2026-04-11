"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (requireTotp) body.totpToken = totpToken;

      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.requireTotp) { setRequireTotp(true); setLoading(false); return; }
      if (!res.ok) { setError(data.error); return; }
      await refresh(); router.push("/");
    } catch { setError("Something went wrong, please try again"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.jpeg" alt="Tsagagram" width={80} height={80} className="rounded-2xl object-contain mb-3" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Tsagagram</h1>
          <p className="text-sm mt-1" style={{ color: "var(--gray-mid)" }}>Visual Storytelling</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!requireTotp ? (
            <>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} required />
            </>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-3">🔐</div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>ორ-ფაქტორიანი ავთენტიფიკაცია</p>
              <p className="text-xs mb-4" style={{ color: "var(--gray-mid)" }}>შეიყვანე 6-ნიშნა კოდი Google Authenticator-დან</p>
              <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center text-xl tracking-widest"
                style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }}
                autoFocus />
            </div>
          )}
          {error && <p className="text-sm text-center" style={{ color: "#e8534a" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white mt-1 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            {loading ? "..." : requireTotp ? "დადასტურება" : "შესვლა"}
          </button>
          {!requireTotp && (
            <Link href="/forgot-password" className="text-sm text-center block" style={{ color: "var(--gray-mid)" }}>
              პაროლი დაგავიწყდა?
            </Link>
          )}
          {requireTotp && (
            <button type="button" onClick={() => setRequireTotp(false)}
              className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
              უკან
            </button>
          )}
        </form>
        {!requireTotp && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-xs" style={{ color: "var(--gray-mid)" }}>OR</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <p className="text-center text-sm" style={{ color: "var(--navy)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold" style={{ color: "var(--gold)" }}>Sign up</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
