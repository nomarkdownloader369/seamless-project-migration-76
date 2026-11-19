/** Real sign-in via Lovable Cloud (Google). Admin status comes from the server-side user_roles table. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export interface SessionUser { id: string; email: string; name: string; avatar?: string | undefined; isAdmin: boolean }

export class GoogleAuthNotConnectedError extends Error {
  constructor() { super("Google sign-in is not connected yet."); }
}

const RETURN_KEY = "pxd-return-to";

async function loadUser(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name: (meta["full_name"] as string) || (meta["name"] as string) || (u.email ?? "").split("@")[0] || "User",
    avatar: (meta["avatar_url"] as string) || undefined,
    isAdmin: !!roles?.some((r) => r.role === "admin"),
  };
}

async function signInWithGoogle(returnTo: string): Promise<void> {
  sessionStorage.setItem(RETURN_KEY, returnTo);
  const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (result.error) throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

interface AuthCtx { user: SessionUser | null; ready: boolean; signIn: (returnTo: string) => Promise<void>; signOut: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ user: null, ready: false, signIn: signInWithGoogle, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => loadUser().then((u) => {
      setUser(u); setReady(true);
      const back = sessionStorage.getItem(RETURN_KEY);
      if (u && back) {
        sessionStorage.removeItem(RETURN_KEY);
        if (back.startsWith("/") && !back.startsWith("//") && back !== window.location.pathname) window.location.assign(back);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(refresh, 0);
    });
    refresh();
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <Ctx.Provider value={{ user, ready, signIn: signInWithGoogle, signOut: async () => { await supabase.auth.signOut(); setUser(null); } }}>
      {children}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
