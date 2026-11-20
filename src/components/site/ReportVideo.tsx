import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { submitVideoReport } from "@/lib/support.functions";
import { reportSchema, storedGuestToken } from "@/lib/support-contract";

export function ReportVideo({ videoId, title }: { videoId: string; title: string }) {
  const { lang } = useI18n(); const ar = lang === "ar";
  const submit = useServerFn(submitVideoReport);
  const [open, setOpen] = useState(false); const [reason, setReason] = useState("");
  const [website, setWebsite] = useState(""); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); const [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={o => { if (!busy) { setOpen(o); setError(""); } }}>
    <DialogTrigger asChild><Button variant="secondary"><Flag />{ar ? "الإبلاغ عن الفيديو" : "Report Video"}</Button></DialogTrigger>
    <DialogContent dir={ar ? "rtl" : "ltr"} className="max-w-sm rounded-lg">
      <DialogHeader><DialogTitle>{ar ? "الإبلاغ عن الفيديو" : "Report Video"}</DialogTitle><DialogDescription className="break-words">{title}</DialogDescription></DialogHeader>
      {done ? <p role="status" className="flex items-center gap-2 text-sm text-success"><CheckCircle2 />{ar ? "تم إرسال البلاغ إلى الإدارة." : "Report sent to the administrator."}</p> : <form className="space-y-4" onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const result = reportSchema.safeParse({ token: storedGuestToken(), videoId, reason, website });
        if (!result.success) { setError(ar ? "اكتب سببًا صالحًا (حتى ٢٠٠٠ حرف)." : "Enter a valid reason (up to 2,000 characters)."); return; }
        setBusy(true); setError("");
        try { await submit({ data: result.data }); setDone(true); setReason(""); }
        catch (err) { setError(ar ? "تعذر إرسال البلاغ؛ ربما سبق أن أبلغت عن هذا الفيديو. حاول لاحقًا." : err instanceof Error ? err.message : "Report was not saved."); }
        finally { setBusy(false); }
      }}>
        <label className="block text-sm font-semibold">{ar ? "سبب البلاغ" : "Reason"}<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} rows={4} className="mt-2 w-full rounded-md border bg-surface px-3 py-2 text-sm" /></label>
        <input aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" value={website} onChange={e => setWebsite(e.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !reason.trim()} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <Flag />}{busy ? ar ? "جارٍ الإرسال…" : "Sending…" : ar ? "إرسال البلاغ" : "Submit report"}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}