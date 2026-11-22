import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ClipboardList, Clock, CircleCheck, CircleX, CloudOff, Database, FileText, Film, History, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createAssistantTask, getAssistantTasks, getAssistantActivity, getAssistantAutomations, saveAssistantAutomation, deleteAssistantAutomation } from "@/lib/assistant.functions";
import { taskStatuses } from "@/lib/assistant-contract";
import type { Tables } from "@/integrations/supabase/types";

export const centerField = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
export function StateBadge({ status }: { status: string }) {
  const { lang } = useI18n();
  const labels: Record<string, string> = lang === "ar" ? { pending: "معلقة", running: "قيد التنفيذ", completed: "مكتملة", failed: "فشلت", planned: "خطة فقط", real: "تنفيذ فعلي", simulated: "محاكاة", disabled: "غير مفعّلة" } : { pending: "Pending", running: "Running", completed: "Completed", failed: "Failed", planned: "Plan only", real: "Real execution", simulated: "Simulated", disabled: "Disabled" };
  const color = status === "completed" ? "text-success bg-success/10" : status === "failed" ? "text-destructive bg-destructive/10" : status === "running" || status === "pending" ? "text-warning bg-warning/10" : "text-muted-foreground bg-surface-2";
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold ${color}`}><span className="size-1 rounded-full bg-current" />{labels[status] ?? status}</span>;
}
export function CenterEmpty({ title, detail, icon: Icon = ClipboardList }: { title: string; detail: string; icon?: typeof ClipboardList }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-3 border-y py-10 text-center"><Icon className="size-8 text-muted-foreground" /><h3 className="font-semibold">{title}</h3><p className="max-w-md px-4 text-sm text-muted-foreground">{detail}</p></div>;
}
export function LoadError({ retry }: { retry: () => void }) {
  const { lang } = useI18n(); return <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-y py-4 text-sm text-destructive">{lang === "ar" ? "تعذر تحميل السجلات." : "Records could not be loaded."}<Button variant="outline" size="sm" onClick={retry}><RefreshCw />{lang === "ar" ? "إعادة المحاولة" : "Retry"}</Button></div>;
}
function stamp(value: string, ar: boolean) { return new Date(value).toLocaleString(ar ? "ar" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export function TaskDraftDialog({ open, onClose, initialCommand = "", threadId, kind = "plan" }: { open: boolean; onClose: () => void; initialCommand?: string; threadId?: string; kind?: "plan" | "catalog_audit" }) {
  const { lang } = useI18n(); const ar = lang === "ar";
  const [command, setCommand] = useState(initialCommand);
  const [id] = useState(() => crypto.randomUUID());
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const create = useServerFn(createAssistantTask); const client = useQueryClient();
  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try { await create({ data: { id, command: kind === "catalog_audit" ? "Read-only catalog audit" : command, kind, confirmed: true, ...(threadId ? { threadId } : {}) } });
      await Promise.all([client.invalidateQueries({ queryKey: ["assistant-tasks"] }), client.invalidateQueries({ queryKey: ["assistant-activity"] })]); onClose();
    } catch { setError(ar ? "تعذر تأكيد حفظ المهمة. تحقق من السجل أو أعد المحاولة." : "Task save could not be confirmed. Check history or retry."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{kind === "catalog_audit" ? (ar ? "تدقيق الأرشيف" : "Catalog audit") : (ar ? "خطة مهمة جديدة" : "New task plan")}</DialogTitle><DialogDescription>{kind === "catalog_audit" ? (ar ? "قراءة فعلية لأعداد الفيديوهات فقط. لا تعديل أو نشر." : "A real read-only count of archive videos. No edits or publication.") : (ar ? "ستُحفظ كمهمة معلقة فقط. المحرك غير متصل ولن تُنفذ تلقائيًا." : "Saved as Pending, plan only. No executor is connected; it will not run automatically.")}</DialogDescription></DialogHeader>
    {kind === "plan" && <label className="grid gap-2 text-sm">{ar ? "الأمر" : "Command"}<Textarea autoFocus dir="auto" value={command} maxLength={20000} onChange={(e) => setCommand(e.target.value)} disabled={busy || confirm} rows={4} /></label>}
    {confirm && <p className="border-s-2 border-primary ps-3 text-sm">{ar ? "تأكيد العملية؟" : "Confirm this action?"}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</Button><Button disabled={busy || (kind === "plan" && !command.trim())} onClick={() => confirm ? void save() : setConfirm(true)}>{busy ? <Loader2 className="animate-spin" /> : kind === "catalog_audit" ? <Database /> : <ClipboardList />}{busy ? (ar ? "جارٍ المعالجة…" : "Processing…") : confirm ? (ar ? "تأكيد" : "Confirm") : (ar ? "متابعة" : "Continue")}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export function TaskCenter() {
  const { lang } = useI18n(); const ar = lang === "ar"; const { user } = useAuth();
  const fetch = useServerFn(getAssistantTasks);
  const tasks = useQuery({ queryKey: ["assistant-tasks", user?.id], queryFn: () => fetch(), enabled: user?.isAdmin === true });
  const [filter, setFilter] = useState("all"); const [draft, setDraft] = useState<"plan" | "catalog_audit" | null>(null);
  const shown = tasks.data?.filter((task) => filter === "all" || task.status === filter) ?? [];
  const labels: Record<string, string> = ar ? { pending: "معلقة", running: "قيد التنفيذ", completed: "مكتملة", failed: "فشلت" } : { pending: "Pending", running: "Running", completed: "Completed", failed: "Failed" };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{ar ? "مركز المهام" : "Task center"}</h2><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setDraft("catalog_audit")}><Database />{ar ? "تدقيق الأرشيف" : "Catalog audit"}</Button><Button size="sm" onClick={() => setDraft("plan")}><Plus />{ar ? "خطة جديدة" : "New plan"}</Button></div></div>
    <dl className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">{taskStatuses.map((status) => <div key={status} className="border-s-2 ps-3"><dt className="text-xs text-muted-foreground">{labels[status]}</dt><dd className="mt-2 font-display text-2xl">{tasks.isSuccess ? tasks.data.filter((t) => t.status === status).length : "—"}</dd></div>)}</dl>
    <label className="flex items-center gap-3 text-sm"><span>{ar ? "الحالة" : "Status"}</span><select aria-label={ar ? "تصفية المهام" : "Filter tasks"} className={`${centerField} max-w-48`} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">{ar ? "كل المهام" : "All tasks"}</option>{taskStatuses.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</select></label>
    {tasks.isPending ? <Loader2 className="mx-auto animate-spin" /> : tasks.isError ? <LoadError retry={() => void tasks.refetch()} /> : !shown.length ? <CenterEmpty title={ar ? "لا توجد مهام" : "No tasks"} detail={ar ? "لا توجد عمليات تنفيذ مسجلة لهذا العرض." : "No recorded tasks for this view."} /> : <div className="divide-y border-y">{shown.map((task) => <details key={task.id} className="group py-4"><summary className="flex cursor-pointer flex-wrap items-center gap-2"><Terminal className="size-4 shrink-0 text-muted-foreground" /><span dir="auto" className="min-w-0 flex-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">{task.title}</span><StateBadge status={task.status} /><StateBadge status={task.execution_mode} /></summary><div className="mt-4 space-y-3 border-s-2 ps-4"><p dir="auto" className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{task.command}</p><dl className="flex flex-wrap gap-4 text-xs text-muted-foreground"><div><dt>{ar ? "أُنشئت" : "Created"}</dt><dd>{stamp(task.created_at, ar)}</dd></div>{task.started_at && <div><dt>{ar ? "بدأت" : "Started"}</dt><dd>{stamp(task.started_at, ar)}</dd></div>}{task.finished_at && <div><dt>{ar ? "انتهت" : "Finished"}</dt><dd>{stamp(task.finished_at, ar)}</dd></div>}</dl>{task.error && <p role="alert" className="text-sm text-destructive">{task.error}</p>}<h3 className="text-xs font-semibold uppercase text-muted-foreground">{ar ? "سجل التنفيذ" : "Execution log"}</h3><ol className="space-y-2 font-mono text-xs">{task.logs.map((log, i) => <li key={i} className="break-words [overflow-wrap:anywhere]"><time className="text-muted-foreground">{stamp(log.at, ar)}</time><p>{log.event}</p>{log.total !== undefined && <p>{ar ? "الإجمالي" : "Total"}: {log.total} · {ar ? "منشور" : "Published"}: {log.published} · {ar ? "معلق" : "Pending"}: {log.pending}</p>}</li>)}</ol>{task.execution_mode === "planned" && <p className="flex gap-2 text-xs text-warning"><CloudOff className="size-4 shrink-0" />{ar ? "خطة محفوظة فقط؛ لم تُنفذ ولن تُنفذ تلقائيًا." : "Saved plan only. Not executed or queued for automatic execution."}</p>}{task.thread_id && <Button asChild variant="outline" size="sm"><Link to="/admin/assistant/$threadId" params={{ threadId: task.thread_id }}>{ar ? "المحادثة المرتبطة" : "Related conversation"}</Link></Button>}</div></details>)}</div>}
    {draft && <TaskDraftDialog key={draft} open onClose={() => setDraft(null)} kind={draft} />}
  </div>;
}

type Automation = Tables<"assistant_automations">;
export function AutomationCenter() {
  const { lang } = useI18n(); const ar = lang === "ar"; const { user } = useAuth(); const client = useQueryClient();
  const fetch = useServerFn(getAssistantAutomations); const save = useServerFn(saveAssistantAutomation); const remove = useServerFn(deleteAssistantAutomation);
  const schedules = useQuery({ queryKey: ["assistant-automations", user?.id], queryFn: () => fetch(), enabled: user?.isAdmin === true });
  const [edit, setEdit] = useState<{ id: string; name: string; command: string; date: string; recurrence: "once" | "daily" | "weekly" } | null>(null);
  const [confirm, setConfirm] = useState(false); const [toDelete, setToDelete] = useState<Automation | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  function openEdit(schedule?: Automation) {
    setConfirm(false); setError(""); setNotice("");
    const date = schedule ? new Date(schedule.scheduled_at) : new Date(Date.now() + 86400000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    setEdit({ id: schedule?.id ?? crypto.randomUUID(), name: schedule?.name ?? "", command: schedule?.command ?? "", date: local, recurrence: schedule?.recurrence === "daily" ? "daily" : schedule?.recurrence === "weekly" ? "weekly" : "once" });
  }
  async function persist() {
    if (!edit || busy) return;
    setBusy(true); setError("");
    try { await save({ data: { id: edit.id, name: edit.name, command: edit.command, scheduledAt: new Date(edit.date).toISOString(), recurrence: edit.recurrence, enabled: false, confirmed: true } }); await refresh(); setEdit(null); setNotice(ar ? "حُفظت الخطة غير المفعّلة." : "Disabled schedule draft saved."); }
    catch { setError(ar ? "تعذر حفظ الخطة." : "Schedule could not be saved."); }
    finally { setBusy(false); }
  }
  async function refresh() { await Promise.all([client.invalidateQueries({ queryKey: ["assistant-automations"] }), client.invalidateQueries({ queryKey: ["assistant-activity"] })]); }
  async function deleteConfirmed() {
    if (!toDelete || busy) return; setBusy(true); setError("");
    try { await remove({ data: { id: toDelete.id, confirmed: true } }); await refresh(); setToDelete(null); setNotice(ar ? "حُذفت الخطة." : "Schedule draft deleted."); }
    catch { setError(ar ? "تعذر حذف الخطة." : "Schedule could not be deleted."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{ar ? "مركز الأتمتة" : "Automation center"}</h2><Button size="sm" onClick={() => openEdit()}><Plus />{ar ? "خطة جدولة" : "Schedule draft"}</Button></div>
    <div className="flex gap-3 border-y bg-surface py-4 px-3 text-sm"><CloudOff className="size-5 shrink-0 text-warning" /><div><p className="font-semibold">{ar ? "المجدول غير متصل" : "Scheduler disconnected"}</p><p className="mt-1 text-xs text-muted-foreground">{ar ? "كل الجداول غير مفعّلة. لا توجد عمليات تشغيل آلية." : "All schedules are disabled. No automated executions are running."}</p></div></div>
    {notice && <p role="status" className="flex items-center gap-2 text-sm text-success"><CircleCheck className="size-4" />{notice}</p>}{error && !edit && !toDelete && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {schedules.isPending ? <Loader2 className="animate-spin" /> : schedules.isError ? <LoadError retry={() => void schedules.refetch()} /> : !schedules.data.length ? <CenterEmpty title={ar ? "لا توجد جداول" : "No scheduled tasks"} detail={ar ? "لم تُنشأ أي خطة جدولة بعد." : "No schedule drafts have been created."} icon={CalendarClock} /> : <ul className="divide-y border-y">{schedules.data.map((s) => <li key={s.id} className="flex flex-wrap items-start gap-3 py-4"><CalendarClock className="mt-1 size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><h3 dir="auto" className="break-words font-semibold [overflow-wrap:anywhere]">{s.name}</h3><p className="mt-1 text-xs text-muted-foreground">{stamp(s.scheduled_at,ar)} · {ar ? ({ once: "مرة واحدة", daily: "يوميًا", weekly: "أسبوعيًا" }[s.recurrence] ?? s.recurrence) : s.recurrence}</p><p dir="auto" className="mt-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{s.command}</p></div><div className="flex items-center gap-1"><StateBadge status="disabled" /><Switch checked={false} disabled aria-label={ar ? "تفعيل الأتمتة غير متاح" : "Automation activation unavailable"} title={ar ? "المجدول غير متصل" : "Scheduler disconnected"} /><Button variant="ghost" size="icon" aria-label={ar ? "تعديل الجدول" : "Edit schedule"} title={ar ? "تعديل الجدول" : "Edit schedule"} onClick={() => openEdit(s)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={ar ? "حذف الجدول" : "Delete schedule"} title={ar ? "حذف الجدول" : "Delete schedule"} onClick={() => { setError(""); setToDelete(s); }}><Trash2 /></Button></div></li>)}</ul>}
    <section className="border-t pt-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="size-4" />{ar ? "سجل التنفيذ والأخطاء" : "Execution & errors"}</h3><p className="text-sm text-muted-foreground">{ar ? "لا توجد عمليات تنفيذ آلية. المجدول غير متصل." : "No automation executions. Scheduler is not connected."}</p></section><ActivityHistory />
    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !busy) setEdit(null); }}><DialogContent><DialogHeader><DialogTitle>{ar ? "خطة جدولة غير مفعّلة" : "Disabled schedule draft"}</DialogTitle><DialogDescription>{ar ? "حفظ إعدادات فقط، دون تشغيل أو نشر." : "Save configuration only. No execution or publication."}</DialogDescription></DialogHeader>{edit && <div className="grid gap-3"><label className="grid gap-1 text-sm">{ar ? "الاسم" : "Name"}<Input autoFocus dir="auto" maxLength={120} value={edit.name} disabled={busy || confirm} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label><label className="grid gap-1 text-sm">{ar ? "الأمر" : "Command"}<Textarea dir="auto" maxLength={20000} value={edit.command} disabled={busy || confirm} onChange={(e) => setEdit({ ...edit, command: e.target.value })} /></label><label className="grid gap-1 text-sm">{ar ? "الموعد المحلي" : "Local schedule time"}<Input type="datetime-local" value={edit.date} disabled={busy || confirm} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label><label className="grid gap-1 text-sm">{ar ? "التكرار" : "Recurrence"}<select className={centerField} value={edit.recurrence} disabled={busy || confirm} onChange={(e) => setEdit({ ...edit, recurrence: e.target.value === "daily" ? "daily" : e.target.value === "weekly" ? "weekly" : "once" })}><option value="once">{ar ? "مرة واحدة" : "Once"}</option><option value="daily">{ar ? "يوميًا" : "Daily"}</option><option value="weekly">{ar ? "أسبوعيًا" : "Weekly"}</option></select></label></div>}{confirm && <p className="text-sm text-warning">{ar ? "تأكيد حفظ الخطة غير المفعّلة؟" : "Confirm saving this disabled draft?"}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={() => setEdit(null)}>{ar ? "إلغاء" : "Cancel"}</Button><Button disabled={busy || !edit?.name.trim() || !edit.command.trim() || !edit.date} onClick={() => confirm ? void persist() : setConfirm(true)}>{busy && <Loader2 className="animate-spin" />}{confirm ? (ar ? "تأكيد الحفظ" : "Confirm save") : (ar ? "متابعة" : "Continue")}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open && !busy) setToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{ar ? "حذف خطة الجدولة؟" : "Delete schedule draft?"}</AlertDialogTitle><AlertDialogDescription>{toDelete?.name}</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void deleteConfirmed(); }}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}{ar ? "تأكيد الحذف" : "Confirm delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

export function ActivityHistory() {
  const { lang } = useI18n(); const ar = lang === "ar"; const { user } = useAuth(); const fetch = useServerFn(getAssistantActivity);
  const activity = useQuery({ queryKey: ["assistant-activity", user?.id], queryFn: () => fetch(), enabled: user?.isAdmin === true });
  const names: Record<string,string> = ar ? { conversation_cleared: "مُسحت المحادثة", conversation_renamed: "عُدّل اسم المحادثة", conversation_deleted: "حُذفت المحادثة", task_plan_saved: "حُفظت خطة مهمة", catalog_audit_executed: "أُجري تدقيق الأرشيف", automation_draft_saved: "حُفظت خطة جدولة", automation_draft_deleted: "حُذفت خطة جدولة" } : { conversation_cleared: "Conversation cleared", conversation_renamed: "Conversation renamed", conversation_deleted: "Conversation deleted", task_plan_saved: "Task plan saved", catalog_audit_executed: "Catalog audit executed", automation_draft_saved: "Schedule draft saved", automation_draft_deleted: "Schedule draft deleted" };
  return <section className="border-t pt-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{ar ? "سجل النشاط" : "Activity history"}</h3>{activity.isPending ? <Loader2 className="size-4 animate-spin" /> : activity.isError ? <LoadError retry={() => void activity.refetch()} /> : activity.data.length ? <ul className="max-h-80 divide-y overflow-y-auto">{activity.data.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{names[a.action] ?? a.action}</span><time dateTime={a.created_at} className="text-xs text-muted-foreground">{stamp(a.created_at,ar)}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">{ar ? "لا يوجد نشاط مسجل." : "No recorded activity."}</p>}</section>;
}

export function CloudFamCenter() {
  const { lang } = useI18n(); const ar = lang === "ar";
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">CloudFam</h2><span className="flex items-center gap-2 text-xs text-warning"><CloudOff className="size-4" />{ar ? "غير متصل" : "Disconnected"}</span></div>
    <dl className="grid gap-5 border-y py-5 sm:grid-cols-3">{[{ label: ar ? "حالة الاتصال" : "Connection", value: ar ? "غير مُعدّ" : "Not configured", icon: CloudOff },{ label: ar ? "آخر مزامنة" : "Last synchronization", value: ar ? "لم تتم" : "Never synchronized", icon: Clock },{ label: ar ? "حالة التكامل" : "Integration health", value: ar ? "لم تُتحقق" : "Not verified", icon: CircleX }].map(({label,value,icon:Icon}) => <div key={label} className="border-s-2 ps-3"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" />{label}</dt><dd className="mt-2 text-sm font-semibold">{value}</dd></div>)}</dl>
    <div className="divide-y">{[{ title: ar ? "اكتشاف الفيديوهات" : "Video discovery", icon: Film, action: ar ? "اكتشاف" : "Discover" },{ title: ar ? "استرجاع البيانات" : "Metadata retrieval", icon: FileText, action: ar ? "استرجاع" : "Retrieve" },{ title: ar ? "مزامنة المكتبة" : "Library synchronization", icon: RefreshCw, action: ar ? "مزامنة" : "Synchronize" }].map(({title,icon:Icon,action}) => <div key={title} className="flex items-center justify-between gap-3 py-5"><div className="flex items-center gap-3"><Icon className="size-5 shrink-0 text-muted-foreground" /><h3 className="text-sm font-semibold">{title}</h3></div><Button variant="outline" size="sm" disabled><Icon />{action}</Button></div>)}</div>
    <div className="flex gap-2 border-y py-4 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /><p>{ar ? "مفاتيح الاتصال تبقى على الخادم. لا يوجد اتصال API أو مزامنة مفعّلة." : "Connection keys stay server-side. No authenticated API connection or synchronization is active."}</p></div>
    <section className="border-t pt-5"><div className="flex items-center gap-2"><Terminal className="size-5 text-primary" /><h3 className="font-semibold">{ar ? "محرك المساعد" : "Assistant engine"}</h3></div><p className="mt-2 text-sm text-muted-foreground">{ar ? "غير متصل. الرسائل محفوظة؛ لا تُولد إجابات أو تُنفذ أوامر." : "Disconnected. Messages are saved; no answers are generated or commands executed."}</p></section>
  </div>;
}
