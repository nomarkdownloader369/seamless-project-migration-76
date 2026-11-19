import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Trash2, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Conversation, ConversationContent, ConversationScrollButton, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getAssistantConversation, saveAssistantMessage, clearAssistantConversation } from "@/lib/assistant.functions";
import logo from "@/assets/logo-skull.png.asset.json";

export function AssistantEmpty() {
  const { lang } = useI18n();
  return <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-5 text-center lg:min-h-[600px]"><img src={logo.url} alt="" className="size-16 object-contain" /><h2 className="font-display text-xl font-bold uppercase">PUREXDARK {lang === "ar" ? "المساعد" : "Assistant"}</h2><p className="text-sm text-muted-foreground">{lang === "ar" ? "اختر محادثة أو أنشئ محادثة جديدة." : "Select a conversation or start a new chat."}</p><span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CloudOff className="size-4" />{lang === "ar" ? "المحرك غير متصل" : "AI engine not connected"}</span></div>;
}

export function AssistantChat({ threadId }: { threadId: string }) {
  const { lang } = useI18n(); const ar = lang === "ar";
  const { user } = useAuth();
  const input = useRef<HTMLTextAreaElement>(null);
  const lock = useRef(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const get = useServerFn(getAssistantConversation);
  const save = useServerFn(saveAssistantMessage);
  const clear = useServerFn(clearAssistantConversation);
  const client = useQueryClient();
  const queryKey = ["assistant-conversation", user?.id, threadId];
  const conversation = useQuery({ queryKey, queryFn: () => get({ data: { threadId } }), enabled: user?.isAdmin === true });
  useEffect(() => { input.current?.focus(); }, [threadId, conversation.isSuccess]);
  async function send() {
    const value = text.trim(); if (!value || lock.current) return;
    lock.current = true; setPending(value); setText(""); setError(""); setNotice(false);
    input.current?.focus();
    try {
      await save({ data: { threadId, text: value } });
      await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ["assistant-threads"] })]);
      setNotice(true);
    } catch { setText(value); setError(ar ? "لم يتم حفظ الرسالة. حاول مرة أخرى." : "Message was not saved. Please try again."); }
    finally { lock.current = false; setPending(""); input.current?.focus(); }
  }
  async function clearConfirmed() {
    setClearing(true); setError("");
    try {
      await clear({ data: { threadId, confirmed: true } });
      await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ["assistant-threads"] }), client.invalidateQueries({ queryKey: ["assistant-activity"] })]);
      setNotice(false); setConfirm(false);
    } catch { setError(ar ? "تعذر مسح المحادثة." : "Could not clear the conversation."); setConfirm(false); }
    finally { setClearing(false); input.current?.focus(); }
  }
  return <div className="flex h-[calc(100dvh-15rem)] min-h-[420px] min-w-0 flex-col md:h-[600px] lg:h-[660px]">
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3"><h2 dir="auto" className="min-w-0 truncate text-sm font-semibold">{conversation.data?.thread.title || (ar ? "المحادثة" : "Conversation")}</h2><Button variant="ghost" size="icon" aria-label={ar ? "مسح المحادثة" : "Clear conversation"} title={ar ? "مسح المحادثة" : "Clear conversation"} disabled={!conversation.data?.messages.length || Boolean(pending) || clearing} onClick={() => setConfirm(true)}><Trash2 /></Button></div>
    <div className="flex shrink-0 gap-2 border-b bg-surface px-4 py-3 text-xs text-muted-foreground"><CloudOff className="size-4 shrink-0" /><p>{ar ? "المحرك غير متصل. الرسائل تُحفظ فقط؛ لا يتم إرسالها للذكاء الاصطناعي أو تنفيذ أي إجراءات." : "AI engine not connected. Messages are saved only; no AI requests or actions are executed."}</p></div>
    <Conversation className="min-h-0"><ConversationContent className="gap-5 p-3 sm:p-4">
      {conversation.isPending && <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
      {conversation.isError && <div role="alert" className="text-center text-sm text-destructive">{ar ? "تعذر تحميل هذه المحادثة." : "Could not load this conversation."}<Button variant="ghost" size="sm" onClick={() => conversation.refetch()}><RefreshCw />{ar ? "إعادة المحاولة" : "Retry"}</Button></div>}
      {conversation.isSuccess && !conversation.data.messages.length && !pending && <ConversationEmptyState title="" description=""><img src={logo.url} alt="" className="size-12 object-contain" /><h3 className="font-display text-lg uppercase">{ar ? "محادثة جديدة" : "New conversation"}</h3><p className="text-xs text-muted-foreground">{ar ? "المحرك وCloudFam غير متصلين." : "AI engine and CloudFam are not connected."}</p></ConversationEmptyState>}
      {conversation.data?.messages.map((m) => <Message key={m.id} from={m.role === "assistant" ? "assistant" : "user"}>
        <MessageContent className="group-[.is-user]:bg-secondary group-[.is-user]:text-secondary-foreground"><div dir="auto" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.parts.map((part, i) => m.role === "assistant" ? <MessageResponse key={i}>{part.text}</MessageResponse> : <span key={i}>{part.text}</span>)}</div></MessageContent>
        <time dateTime={m.created_at} className="text-end text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString(ar ? "ar" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
      </Message>)}
      {pending && <><Message from="user"><MessageContent><p dir="auto" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{pending}</p></MessageContent></Message><div role="status" className="text-sm text-muted-foreground"><Shimmer>{ar ? "جارٍ حفظ الرسالة…" : "Saving message…"}</Shimmer></div></>}
    </ConversationContent><ConversationScrollButton aria-label={ar ? "آخر رسالة" : "Latest message"} /></Conversation>
    <div className="shrink-0 border-t bg-background p-2 sm:p-3">
      {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
      {notice && <p role="status" className="mb-2 text-xs text-muted-foreground">{ar ? "تم الحفظ. لا توجد إجابة لأن المحرك غير متصل." : "Saved. No assistant reply: the AI engine is not connected."}</p>}
      <PromptInput onSubmit={send}><PromptInputTextarea ref={input} dir="auto" aria-label={ar ? "الرسالة" : "Message"} placeholder={ar ? "اكتب رسالتك…" : "Write a message…"} value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} disabled={!conversation.isSuccess || clearing} className="min-h-14 max-h-32 sm:min-h-20 sm:max-h-40" /><PromptInputFooter className="justify-end"><PromptInputSubmit status={pending ? "submitted" : "ready"} disabled={!text.trim() || Boolean(pending) || !conversation.isSuccess || clearing} aria-label={ar ? "إرسال الرسالة" : "Send message"} title={ar ? "إرسال الرسالة" : "Send message"}>{pending ? <Loader2 className="animate-spin" /> : <Send />}</PromptInputSubmit></PromptInputFooter></PromptInput>
    </div>
    <AlertDialog open={confirm} onOpenChange={(open) => { if (!clearing) setConfirm(open); }}><AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg"><AlertDialogHeader><AlertDialogTitle>{ar ? "مسح هذه المحادثة؟" : "Clear this conversation?"}</AlertDialogTitle><AlertDialogDescription>{ar ? "سيتم حذف جميع رسائل هذه المحادثة نهائيًا وتسجيل العملية في سجل النشاط." : "All messages in this conversation will be permanently removed. This action will be recorded in activity history."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={clearing}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel><AlertDialogAction disabled={clearing} onClick={(e) => { e.preventDefault(); void clearConfirmed(); }}>{clearing ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}{ar ? "مسح المحادثة" : "Clear conversation"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}