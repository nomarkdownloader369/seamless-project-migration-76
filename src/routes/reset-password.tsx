import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set Password — TABOOBOX" }, { name: "description", content: "Verify your email and set your TABOOBOX password." },
    { property: "og:title", content: "Set Password — TABOOBOX" }, { property: "og:description", content: "Verify your email and set your TABOOBOX password." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: SetPassword,
});

function SetPassword() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const check = () => { void supabase.auth.getUser().then(({ data }) => setVerified(Boolean(data.user?.email_confirmed_at))); };
    check();
    const { data } = supabase.auth.onAuthStateChange(() => setTimeout(check, 0));
    return () => data.subscription.unsubscribe();
  }, []);
  return <div className="mx-auto max-w-sm px-4 py-12">
    <h1 className="font-display text-2xl font-bold uppercase">Set your password</h1>
    {done ? <div className="mt-4 space-y-4"><p>Password saved.</p><Link to="/login" className="text-primary">Sign in</Link></div> : verified ?
      <form className="mt-5 space-y-4" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false); if (error) setError(error.message); else { await supabase.auth.signOut(); setDone(true); }
      }}>
        <label className="block text-sm">New password<input required type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-md border bg-surface px-3" /></label>
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : "Save password"}</Button>
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </form> : <p className="mt-4 text-muted-foreground">Open the verification link sent to your email. <Link to="/login" className="text-primary">Back to sign in</Link></p>}
  </div>;
}