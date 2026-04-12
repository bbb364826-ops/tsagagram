"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  isPrivate?: boolean;
  verified?: boolean;
  totpEnabled?: boolean;
  _count?: { posts: number; followers: number; following: number };
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      // data can be null (no session) or a user object
      setUser(data && data.id ? data : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update lastSeen every 2 minutes while active
  useEffect(() => {
    const ping = () => fetch("/api/auth/ping", { method: "POST" }).catch(() => {});
    ping();
    const id = setInterval(ping, 120000);
    return () => clearInterval(id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    setUser(null);
    setLoading(false);
    router.push("/login");
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
