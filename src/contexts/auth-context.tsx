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
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { GUEST_CART_KEY } from "@/lib/guest-cart-constants";
import { getSafeNextPath } from "@/lib/auth-redirect";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

export type { Profile };

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<string | null>;
  signInWithOAuth: (
    provider: "google",
    options?: { next?: string | null }
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = getSupabaseCustomerBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name, phone")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
    return data as Profile | null;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u?.id) return null;
    return fetchProfile(u.id);
  }, [fetchProfile, supabase]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCustomerFromApi(): Promise<{
      id: string;
      email: string | null;
    } | null> {
      const res = await fetch("/api/auth/customer-session", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        user: { id: string; email: string | null } | null;
      };
      return data.user ?? null;
    }

    async function applySessionOrApi(
      sessionUser: User | null,
      apiFallback: boolean
    ) {
      if (cancelled) return;
      if (sessionUser) {
        setUser(sessionUser);
        await fetchProfile(sessionUser.id);
        return;
      }
      if (!apiFallback) {
        setUser(null);
        setProfile(null);
        return;
      }
      try {
        const apiUser = await fetchCustomerFromApi();
        if (cancelled) return;
        if (apiUser) {
          setUser({
            id: apiUser.id,
            email: apiUser.email ?? undefined,
          } as User);
          await fetchProfile(apiUser.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      }
    }

    async function initAuth() {
      try {
        const [{ data: sessionData }, apiUser] = await Promise.all([
          supabase.auth.getSession(),
          fetchCustomerFromApi(),
        ]);
        if (cancelled) return;

        const sessionUser = sessionData.session?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
          await fetchProfile(sessionUser.id);
        } else if (apiUser) {
          setUser({
            id: apiUser.id,
            email: apiUser.email ?? undefined,
          } as User);
          await fetchProfile(apiUser.id);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (evt: AuthChangeEvent, session: Session | null) => {
        setLoading(false);
        const sessionUser = session?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
          void fetchProfile(sessionUser.id);
          return;
        }
        if (evt === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          return;
        }
        await applySessionOrApi(null, true);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  function postCustomerAuthPath(): string {
    if (typeof window !== "undefined") {
      const next = getSafeNextPath(
        new URLSearchParams(window.location.search).get("next")
      );
      if (next) return next;
    }
    return "/";
  }

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
      if (p?.role === "admin" || p?.role === "super_admin") {
        await supabase.auth.signOut();
        await fetch("/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience: "customer" }),
        });
        return "adminPortal";
      }
      router.push(postCustomerAuthPath());
    }
    return null;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    });
    if (error) return error.message;

    if (data.session && data.user) {
      const p = await fetchProfile(data.user.id);
      if (p?.role === "admin" || p?.role === "super_admin") {
        await supabase.auth.signOut();
        await fetch("/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience: "customer" }),
        });
        return "adminPortal";
      }
      router.push(postCustomerAuthPath());
    } else {
      router.push("/sign-in?message=confirm-email");
    }
    return null;
  };

  const signInWithOAuth = async (
    provider: "google",
    options?: { next?: string | null }
  ) => {
    const next = getSafeNextPath(options?.next ?? undefined);
    const qs = next ? `?next=${encodeURIComponent(next)}` : "";
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback/customer${qs}`,
      },
    });
  };

  const signOutFn = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    await fetch("/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience: "customer" }),
    });
    setUser(null);
    setProfile(null);
    window.location.href = "/sign-in";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
        signIn,
        signUp,
        signInWithOAuth,
        signOut: signOutFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
