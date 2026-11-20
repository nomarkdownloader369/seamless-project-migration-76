import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { GoogleButton } from "@/components/site/GoogleButton";
import { GoogleAuthNotConnectedError, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface LoginSearch { redirect?: string | undefined; reason?: "favorites" | undefined }

/** Only same-site paths are allowed as a return target. */
export function safeRedirect(r: unknown): string {
  return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/";
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s["redirect"] === "string" ? safeRedirect(s["redirect"]) : undefined,
    reason: s["reason"] === "favorites" ? "favorites" : undefined,
  }),
  head: () => ({ meta: [
    { title: "Sign in — TABOOBOX" }, { name: "description", content: "Sign in to TABOOBOX with email or Google." },
    { property: "og:title", content: "Sign in — TABOOBOX" }, { property: "og:description", content: "Sign in to TABOOBOX with email or Google." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Login,
});

function Login() {
  const { t, lang } = useI18n();
  const { signIn } = useAuth();
  const { redirect, reason } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setNotice(null); setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      navigate({ to: safeRedirect(redirect) });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (data.session) navigate({ to: safeRedirect(redirect) });
      else { setNotice(t("checkEmail")); setMode("in"); setPassword(""); }
    }
  };

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(safeRedirect(redirect));
    } catch (e) {
      setError(e instanceof GoogleAuthNotConnectedError ? t("googleNotConnected") : (e as Error).message);
      setBusy(false);
    }
  };

  const setupPassword = async () => {
    setError(null); setNotice(null);
    if (!email.trim()) { setError(lang === "ar" ? "اكتب بريدك الإلكتروني أولًا." : "Enter your email address first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/reset-password` } });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice(lang === "ar" ? "افتح بريدك الإلكتروني للتحقق واختيار كلمة سر." : "Check your email to verify your account and choose a password.");
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border bg-surface p-7 text-center">
        <div className="flex justify-center"><Logo size="lg" /></div>
        <h1 className="mt-6 font-display text-2xl font-bold uppercase tracking-wide">{t("signInHeading")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("signInSub")}</p>

        {reason === "favorites" && (
          <p role="status" className="mt-5 flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-start text-sm">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t("favSignIn")}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 rounded-full bg-surface-2 p-1" role="tablist">
          {(["in", "up"] as const).map((m) => (
            <Button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
              className={`rounded-full py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "in" ? t("tabSignIn") : t("tabSignUp")}
            </Button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3 text-start">
          {mode === "up" && (
            <label className="block text-xs font-semibold text-muted-foreground">{t("name")}
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60}
                className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" />
            </label>
          )}
          <label className="block text-xs font-semibold text-muted-foreground">{t("email")}
            <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">{t("password")}
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder={mode === "up" ? t("pwMin") : undefined}
              className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <Button type="submit" disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? t("signInBtn") : t("signUpBtn")}
          </Button>
        </form>
        <Button type="button" variant="link" disabled={busy} onClick={setupPassword} className="mt-2 whitespace-normal">
          {lang === "ar" ? "تأكيد البريد / تعيين كلمة سر جديدة" : "Verify email / set a new password"}
        </Button>

        {notice && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-start text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-start text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </p>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("or")}<span className="h-px flex-1 bg-border" /></div>
        <GoogleButton label={t("continueGoogle")} onClick={start} disabled={busy} />

        <Link to="/" search={{ q: undefined, cat: undefined }} className="mt-6 inline-block text-xs font-semibold text-muted-foreground hover:text-primary">
          <span className="inline-block rtl:rotate-180">←</span> {t("browse")}
        </Link>
      </div>
    </div>
  );
}
