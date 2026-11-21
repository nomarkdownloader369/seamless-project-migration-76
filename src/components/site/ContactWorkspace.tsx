import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Send, Loader2, RefreshCw, MessageSquare, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { conversationSchema, guestTokenSchema, storedGuestToken } from "@/lib/support-contract";
import { createContactConversation, getVisitorConversations, sendVisitorMessage } from "@/lib/support.functions";

export const supportField = "mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
export function ContactWorkspace({ videoId }: { videoId?: string | undefined }) {
  const { lang } = useI18n(); const ar = lang === "ar"; const { user, ready } = useAuth();
  const [token, setToken] = useState(""); const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<"question" | "part" | "series" | "suggestion">("question");
  const [text, setText] = useState(""); const [reply, setReply] = useState(""); const [reference, setReference] = useState("");
  const [website, setWebsite] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { setToken(storedGuestToken()); }, []);
  const list = useServerFn(getVisitorConversations); const create = useServerFn(createContactConversation); const send = useServerFn(sendVisitorMessage); const client = useQueryClient();
  const threads = useQuery({ queryKey: ["visitor-threads", token, user?.id], queryFn: () => list({ data: { token } }), enabled: Boolean(token) && ready, refetchInterval: 30000 });
  const conversation = useQuery({ queryKey: ["visitor-conversation", token, selected, user?.id], queryFn: () => list({ data: { token, id: selected } }), enabled: Boolean(token && selected) && ready, refetchInterval: 30000 });
  async function refresh() { await client.invalidateQueries({ queryKey: ["visitor-threads"] }); await client.invalidateQueries({ queryKey: ["visitor-conversation"] }); }
  const current = conversation.data?.threads[0];
  return <div className="mx-auto max-w-5xl px-3 py-5 md:px-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold">{ar ? "تواصل مع الإدارة / طلب فيديو" : "Contact Admin / Video Requests"}</h1><Button onClick={() => { setCreating(true); setSelected(undefined); setNotice(""); setError(""); }}><Plus />{ar ? "رسالة جديدة" : "New message"}</Button></header>
    <div className="grid min-w-0 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b pb-4 md:border-e md:border-b-0 md:pe-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{ar ? "محادثاتك" : "Your conversations"}</h2><Button variant="ghost" size="icon" aria-label={ar ? "تحديث" : "Refresh"} onClick={refresh}><RefreshCw /></Button></div>
        {threads.isPending && <Loader2 className="size-4 animate-spin" />}
        {threads.isError && <p role="alert" className="text-sm text-destructive">{ar ? "تعذر تحميل المحادثات." : "Could not load conversations."}</p>}
        {threads.data?.threads.length === 0 && <p className="py-4 text-sm text-muted-foreground">{ar ? "لا توجد محادثات بعد." : "No conversations yet."}</p>}
        <nav className="max-h-80 overflow-y-auto">{threads.data?.threads.map(t => <Button key={t.id} variant={selected === t.id ? "secondary" : "ghost"} className="h-auto w-full justify-start py-3" onClick={() => { setSelected(t.id); setCreating(false); setError(""); setNotice(""); }}><MessageSquare /><span className="min-w-0 flex-1 truncate text-start">{t.subject}</span>{t.sender_unread > 0 && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{t.sender_unread}</span>}</Button>)}</nav>
        <details className="mt-5 border-t pt-3"><summary className="text-sm font-semibold">{ar ? "مرجع المحادثات" : "Conversation reference"}</summary><div className="mt-3 space-y-3">
          <Button variant="outline" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(token); setNotice(ar ? "تم نسخ المرجع الخاص؛ لا تشاركه مع الآخرين." : "Private reference copied; do not share it with others."); } catch { setError(ar ? "تعذر النسخ." : "Could not copy reference."); } }}><KeyRound />{ar ? "نسخ المرجع الخاص" : "Copy private reference"}</Button>
          <form onSubmit={e => { e.preventDefault(); if (!guestTokenSchema.safeParse(reference.trim()).success) { setError(ar ? "مرجع غير صالح." : "Invalid reference."); return; } localStorage.setItem("taboobox-visitor-key", reference.trim()); setToken(reference.trim()); setSelected(undefined); setReference(""); }}><label className="text-xs">{ar ? "استعادة بالمرجع الخاص" : "Restore with private reference"}<input type="password" maxLength={64} value={reference} onChange={e => setReference(e.target.value)} className={supportField} /></label><Button type="submit" variant="secondary" className="mt-2 w-full">{ar ? "استعادة" : "Restore"}</Button></form>
        </div></details>
      </aside>
      <section className="min-w-0">
        {notice && <p role="status" className="mb-4 text-sm text-success">{notice}</p>}{error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {creating ? <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; const parsed = conversationSchema.safeParse({ token, name: name || user?.name, subject, kind, videoId, text, website }); if (!parsed.success) { setError(ar ? "أكمل الاسم والموضوع والرسالة." : "Complete your name, subject and message."); return; } setBusy(true); setError(""); try { const result = await create({ data: parsed.data }); setSelected(result.id); setCreating(false); setText(""); setSubject(""); setNotice(ar ? "تم إرسال رسالتك." : "Your message was sent."); await refresh(); } catch (err) { setError(ar ? "لم تُرسل الرسالة؛ تحقق من اتصالك أو افتح الطلب الموجود." : err instanceof Error ? err.message : "Message was not saved."); } finally { setBusy(false); } }}>
          <label className="block text-sm">{ar ? "الاسم" : "Name"}<input required value={name || user?.name || ""} onChange={e => setName(e.target.value)} maxLength={80} className={supportField} /></label>
          <label className="block text-sm">{ar ? "نوع الطلب" : "Request type"}<select value={kind} onChange={e => setKind(e.target.value as typeof kind)} className={supportField}>{([['question', ar ? 'سؤال / رسالة' : 'Question / Message'], ['part', ar ? 'طلب الجزء الثاني' : 'Request a second part'], ['series', ar ? 'المزيد من سلسلة / صانع محتوى' : 'More from a series / creator'], ['suggestion', ar ? 'اقتراح / استفسار آخر' : 'Suggestion / Other inquiry']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-sm">{ar ? "الموضوع" : "Subject"}<input required maxLength={160} value={subject} onChange={e => setSubject(e.target.value)} className={supportField} /></label>
          {videoId && <Link to="/watch/$id" params={{ id: videoId }} className="block text-sm text-primary">{ar ? "الفيديو المرتبط" : "Related video"}</Link>}
          <label className="block text-sm">{ar ? "الرسالة" : "Message"}<textarea required rows={5} maxLength={4000} value={text} onChange={e => setText(e.target.value)} className={supportField} /></label>
          <input aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" value={website} onChange={e => setWebsite(e.target.value)} />
          <Button disabled={busy || !text.trim() || !subject.trim()} type="submit">{busy ? <Loader2 className="animate-spin" /> : <Send />}{ar ? "إرسال" : "Send"}</Button>
        </form> : selected ? <>
          {conversation.isPending && <Loader2 className="size-5 animate-spin" />}{conversation.isError && <p role="alert" className="text-destructive">{ar ? "تعذر فتح المحادثة." : "Could not open conversation."}</p>}
          {current && <><h2 dir="auto" className="mb-2 break-words text-lg font-bold">{current.subject}</h2>{current.video_id && <Link to="/watch/$id" params={{ id: current.video_id }} className="text-sm text-primary">{current.video_title}</Link>}
          <ul className="my-4 max-h-[55vh] space-y-4 overflow-y-auto border-y py-4">{conversation.data?.messages.map(m => <li key={m.id} className={`max-w-[90%] rounded-md px-3 py-2 ${m.role === "sender" ? "ms-auto bg-surface-2" : "me-auto bg-surface"}`}><p className="text-xs font-semibold text-primary">{m.role === "admin" ? ar ? "الإدارة" : "Administrator" : current.sender_name}</p><p dir="auto" className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.text}</p><time className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString(ar ? "ar" : "en")}</time></li>)}</ul>
          <form onSubmit={async e => { e.preventDefault(); if (busy || !reply.trim()) return; setBusy(true); setError(""); try { await send({ data: { token, id: selected, text: reply } }); setReply(""); setNotice(ar ? "تم إرسال الرسالة." : "Message sent."); await refresh(); } catch { setError(ar ? "لم تُرسل الرسالة؛ تجنب تكرار نفس الرسالة." : "Message not sent; avoid sending the same message twice."); } finally { setBusy(false); } }}><label className="block text-sm">{ar ? "ردك" : "Your reply"}<textarea required maxLength={4000} rows={3} value={reply} onChange={e => setReply(e.target.value)} className={supportField} /></label><Button className="mt-3" disabled={busy || !reply.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Send />}{ar ? "إرسال" : "Send"}</Button></form></>}
        </> : <div className="flex min-h-64 items-center justify-center text-muted-foreground"><MessageSquare className="size-8" /></div>}
      </section>
    </div>
  </div>;
}