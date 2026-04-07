"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseAdminBrowser } from "@/lib/supabase-client-admin";
import { getSafeNextPath } from "@/lib/auth-redirect";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

interface AdminAuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(
  undefined
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = getSupabaseAdminBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name, phone, preferred_language, delivery_address")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
    return data as Profile | null;
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    }
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_evt: AuthChangeEvent, session: Session | null) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await fetchProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;

    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    if (signedInUser) {
      const p = await fetchProfile(signedInUser.id);
      if (p?.role !== "admin" && p?.role !== "super_admin") {
        await supabase.auth.signOut();
        await fetch("/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience: "admin" }),
        });
        return "forbidden";
      }
      if (typeof window !== "undefined") {
        const next = getSafeNextPath(
          new URLSearchParams(window.location.search).get("next")
        );
        router.push(next ?? "/admin");
      } else {
        router.push("/admin");
      }
    }
    return null;
  };

  const signOutFn = async () => {
    await fetch("/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience: "admin" }),
    });
    setUser(null);
    setProfile(null);
    window.location.href = "/admin/sign-in";
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut: signOutFn,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
