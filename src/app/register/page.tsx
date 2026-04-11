"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await refresh(); router.push("/");
    } catch { setError("Something went wrong, please try again"); }
    finally { setLoading(false); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.jpeg" alt="Tsagagram" width={80} height={80} className="rounded-2xl object-contain mb-3" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Create account</h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--gray-mid)" }}>
            Sign up to see photos and videos from your friends.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {[
            { key: "name", placeholder: "Full name", type: "text" },
            { key: "username", placeholder: "Username", type: "text" },
            { key: "email", placeholder: "Email", type: "email" },
            { key: "password", placeholder: "Password (min 6 chars)", type: "password" },
          ].map(f => (
            <input key={f.key} type={f.type} placeholder={f.placeholder}
              value={form[f.key as keyof typeof form]} onChange={set(f.key)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} required />
          ))}
          {error && <p className="text-sm text-center" style={{ color: "#e8534a" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white mt-1 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
            {loading ? "Signing up…" : "Sign up"}
          </button>
          <p className="text-xs text-center" style={{ color: "var(--gray-mid)" }}>
            By signing up, you agree to our Terms and Privacy Policy.
          </p>
        </form>
        <p className="text-center text-sm mt-5" style={{ color: "var(--navy)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--gold)" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
