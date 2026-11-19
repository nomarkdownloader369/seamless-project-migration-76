import { useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Plus, History, Workflow, Cable, ShieldCheck, CloudOff, CalendarClock, Film, CircleCheck, CircleX, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createAssistantThread, getAssistantThreads, getAssistantActivity } from "@/lib/assistant.functions";
import { assistantCapabilities } from "@/lib/assistant-contract";

export function AssistantWorkspace() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const ar = lang === "ar";
  const [tab, setTab] = useState("chat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const create = useServerFn(createAssistantThread);
  const list = useServerFn(getAssistantThreads);
  const threads = useQuery({ queryKey: ["assistant-threads", user?.id], queryFn: () => list(), enabled: user?.isAdmin === true });
  async function newChat() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const thread = await create();
      await client.invalidateQueries({ queryKey: ["assistant-threads"] });
      setTab("chat");
      await navigate({ to: "/admin/assistant/$threadId", params: { threadId: thread.id } });
    } catch { setError(ar ? "تعذر إنشاء المحادثة. حاول مرة أخرى." : "Could not create a conversation. Please try again."); }
    finally { setBusy(false); }
  }
  const history = <>
    {threads.isPending && <Loader2 className="mx-auto my-4 size-4 animate-spin text-muted-foreground" />}
    {threads.isError && <p role="alert" className="p-3 text-sm text-destructive">{ar ? "تعذر تحميل المحادثات." : "Could not load history."}<Button variant="ghost" size="sm" onClick={() => threads.refetch()}><RefreshCw />{ar ? "إعادة المحاولة" : "Retry"}</Button></p>}
    {threads.data?.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">{ar ? "لا توجد محادثات محفوظة." : "No saved conversations."}</p>}
    {threads.data?.map((thread) => <Button key={thread.id} asChild variant="ghost" className="h-auto w-full justify-start px-3 py-3">
      <Link to="/admin/assistant/$threadId" params={{ threadId: thread.id }} onClick={() => setTab("chat")} activeProps={{ className: "bg-surface-2 text-foreground" }}>
        <MessageSquare className="shrink-0 text-muted-foreground" /><span className="min-w-0 text-start"><span dir="auto" className="block truncate text-sm">{thread.title === "New chat" && ar ? "محادثة جديدة" : thread.title}</span><time dateTime={thread.updated_at} className="block text-xs font-normal text-muted-foreground">{new Date(thread.updated_at).toLocaleDateString(ar ? "ar" : "en", { month: "short", day: "numeric" })}</time></span>
      </Link>
    </Button>)}
  </>;
  return <div className="min-w-0">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" />{ar ? "خاص بالمسؤول" : "Administrator workspace"}</div><h1 className="font-display text-2xl font-bold uppercase">{ar ? "المساعد الذكي" : "AI Assistant"}</h1></div>
      <span className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" />{ar ? "المحرك غير متصل" : "AI engine not connected"}</span>
    </header>
    <Tabs value={tab} onValueChange={setTab} className="mb-4 min-w-0"><div className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0 [scrollbar-width:none]"><TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0">
      <TabsTrigger value="chat" className="shrink-0 gap-2"><MessageSquare className="size-4" />{ar ? "المحادثات" : "Chat"}</TabsTrigger>
      <TabsTrigger value="automation" className="shrink-0 gap-2"><Workflow className="size-4" />{ar ? "الأتمتة" : "Automation"}</TabsTrigger>
      <TabsTrigger value="integrations" className="shrink-0 gap-2"><Cable className="size-4" />{ar ? "الاتصالات" : "Integrations"}</TabsTrigger>
    </TabsList></div></Tabs>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    {tab === "chat" && <div className="grid min-w-0 border-y lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b py-3 lg:border-e lg:border-b-0 lg:pe-3">
        <Button className="mb-3 w-full" variant="outline" disabled={busy} onClick={newChat}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}{ar ? "محادثة جديدة" : "New chat"}</Button>
        <details className="lg:hidden"><summary className="flex cursor-pointer items-center gap-2 py-1 text-sm text-muted-foreground"><History className="size-4" />{ar ? "سجل المحادثات" : "Conversation history"} ({threads.data?.length ?? 0})</summary><nav aria-label="Conversation history" className="max-h-48 overflow-y-auto">{history}</nav></details>
        <div className="hidden lg:block"><h2 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">{ar ? "المحادثات" : "Conversations"}</h2><nav aria-label="Conversation history" className="max-h-[550px] overflow-y-auto">{history}</nav></div>
      </aside>
      <div className="min-w-0"><Outlet /></div>
    </div>}
    {tab === "automation" && <AssistantAutomation />}
    {tab === "integrations" && <div>
      <div className="grid grid-cols-1 gap-4 border-y py-5 sm:grid-cols-2">{[ar ? "محرك الذكاء الاصطناعي" : "AI engine", "CloudFam API"].map((name) => <div key={name} className="flex items-center gap-3"><CloudOff className="size-5 text-muted-foreground" /><div><h2 className="font-semibold">{name}</h2><p className="text-sm text-muted-foreground">{ar ? "غير متصل" : "Not connected"}</p></div></div>)}</div>
      <h2 className="mt-5 mb-3 font-display text-lg uppercase">{ar ? "القدرات المخططة" : "Planned capabilities"}</h2>
      <ul className="divide-y">{assistantCapabilities.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{ar ? c.ar : c.name}</span><span className="text-xs text-muted-foreground">{c.permission === "confirm" ? (ar ? "غير متصل · يتطلب تأكيدًا" : "Not connected · Confirmation required") : (ar ? "غير متصل" : "Not connected")}</span></li>)}</ul>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />{ar ? "النشر والتغييرات الحساسة تتطلب تأكيدًا وسجل نشاط." : "Publishing and destructive changes require confirmation and an activity record."}</p>
    </div>}
  </div>;
}

function AssistantAutomation() {
  const { lang } = useI18n(); const ar = lang === "ar";
  const { user } = useAuth();
  const fetchActivity = useServerFn(getAssistantActivity);
  const activity = useQuery({ queryKey: ["assistant-activity", user?.id], queryFn: () => fetchActivity(), enabled: user?.isAdmin === true });
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4"><div className="flex items-center gap-3"><Workflow className="size-5 text-primary" /><div><h2 className="font-semibold">{ar ? "الأتمتة غير نشطة" : "Automation inactive"}</h2><p className="text-sm text-muted-foreground">{ar ? "CloudFam والمحرك غير متصلين." : "CloudFam and the AI engine are not connected."}</p></div></div><Button variant="outline" disabled><RefreshCw />{ar ? "مزامنة الآن" : "Sync now"}</Button></div>
    <dl className="grid grid-cols-1 gap-4 py-6 min-[400px]:grid-cols-2 sm:grid-cols-4">{[{ label: ar ? "المهام المعلقة" : "Pending videos", icon: Film }, { label: ar ? "المكتملة" : "Completed tasks", icon: CircleCheck }, { label: ar ? "الفاشلة" : "Failed tasks", icon: CircleX }, { label: ar ? "المهام المجدولة" : "Scheduled jobs", icon: CalendarClock }].map(({ label, icon: Icon }) => <div key={label} className="border-s-2 ps-3"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</dt><dd className="mt-2 font-display text-3xl">—</dd></div>)}</dl>
    <div className="flex flex-wrap justify-between gap-2 border-y py-3 text-sm"><span className="text-muted-foreground">{ar ? "آخر مزامنة مع CloudFam" : "Last CloudFam synchronization"}</span><span>{ar ? "لم تتم المزامنة" : "Never synchronized"}</span></div>
    <section className="py-5"><h2 className="mb-4 font-display text-lg uppercase">{ar ? "المهام المجدولة" : "Scheduled jobs"}</h2><p className="text-sm text-muted-foreground">{ar ? "لا توجد مهام مجدولة. المجدول غير متصل." : "No scheduled jobs. Scheduler not connected."}</p></section>
    <section className="border-t py-5"><h2 className="mb-4 font-display text-lg uppercase">{ar ? "سجل التنفيذ والنشاط" : "Execution & activity history"}</h2>
      {activity.isPending ? <Loader2 className="size-4 animate-spin" /> : activity.isError ? <p role="alert" className="text-sm text-destructive">{ar ? "تعذر تحميل النشاط." : "Could not load activity."}<Button variant="ghost" size="sm" onClick={() => activity.refetch()}><RefreshCw />Retry</Button></p> : activity.data?.length ? <ul className="divide-y">{activity.data.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{a.action === "conversation_cleared" ? (ar ? "تم مسح المحادثة" : "Conversation cleared") : a.action}</span><time className="text-xs text-muted-foreground" dateTime={a.created_at}>{new Date(a.created_at).toLocaleString(ar ? "ar" : "en")}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">{ar ? "لا يوجد نشاط مسجل. لم تُنفّذ أي مهام." : "No recorded activity. No tasks have been executed."}</p>}
    </section>
  </div>;
}