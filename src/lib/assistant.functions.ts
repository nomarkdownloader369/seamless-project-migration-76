import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assistantMessageInput, assistantClearInput, assistantThreadAction, assistantTaskInput, assistantAutomationInput, assistantDeleteAutomationInput } from "./assistant-contract";

const requireAssistantAdmin = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ context, next }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Administrator access required.");
  return next();
});

export const getAssistantThreads = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("assistant_threads").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
  if (error) throw new Error("Could not load conversation history.");
  return data;
});
export const createAssistantThread = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("assistant_threads").insert({ user_id: context.userId }).select().single();
  if (error || !data) throw new Error("Could not create conversation.");
  return data;
});
export const getAssistantConversation = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: thread, error: threadError } = await context.supabase.from("assistant_threads").select("*").eq("id", data.threadId).eq("user_id", context.userId).single();
  if (threadError || !thread) throw new Error("Conversation unavailable.");
  const { data: messages, error } = await context.supabase.from("assistant_messages").select("*").eq("thread_id", thread.id).order("created_at").order("id");
  if (error) throw new Error("Could not load messages.");
  return { thread, messages: messages.map((m) => ({ ...m, parts: z.array(z.object({ type: z.literal("text"), text: z.string() })).parse(m.parts) })) };
});
export const saveAssistantMessage = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantMessageInput.parse(input)).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from("assistant_messages").insert({ thread_id: data.threadId, role: "user", parts: [{ type: "text", text: data.text }] }).select().single();
  if (error || !row) throw new Error("Message could not be saved. Please try again.");
  // No model or integration is called here. Saved messages are not queued for later execution.
  return { id: row.id, created_at: row.created_at, engineConnected: false as const };
});
export const clearAssistantConversation = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantClearInput.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("assistant_clear_conversation", { p_thread_id: data.threadId });
  if (error) throw new Error("Could not clear conversation.");
  return { cleared: true };
});
export const getAssistantActivity = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("assistant_activity").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Could not load activity history.");
  return data;
});

export const manageAssistantThread = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantThreadAction.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("assistant_manage_thread", { p_id: data.threadId, p_action: data.action, p_title: data.title, p_confirmed: data.confirmed });
  if (error) throw new Error("Conversation change could not be saved.");
  return { saved: true };
});
export const getAssistantTasks = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("assistant_tasks").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load tasks.");
  const log = z.array(z.object({ at: z.string(), event: z.string(), total: z.number().optional(), published: z.number().optional(), pending: z.number().optional() }));
  return data.map((task) => ({ ...task, logs: log.parse(task.logs) }));
});
export const createAssistantTask = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantTaskInput.parse(input)).handler(async ({ data, context }) => {
  const { data: id, error } = await context.supabase.rpc("assistant_create_task", { p_id: data.id, p_command: data.command, p_kind: data.kind, p_confirmed: data.confirmed, ...(data.threadId ? { p_thread_id: data.threadId } : {}) });
  if (error || !id) throw new Error("Task could not be saved.");
  return { id };
});
export const getAssistantAutomations = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("assistant_automations").select("*").eq("user_id", context.userId).order("scheduled_at");
  if (error) throw new Error("Could not load schedules.");
  return data;
});
export const saveAssistantAutomation = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantAutomationInput.parse(input)).handler(async ({ data, context }) => {
  const { data: id, error } = await context.supabase.rpc("assistant_save_automation", { p_id: data.id, p_name: data.name, p_command: data.command, p_scheduled_at: data.scheduledAt, p_recurrence: data.recurrence, p_enabled: data.enabled, p_confirmed: data.confirmed });
  if (error || !id) throw new Error("Schedule could not be saved.");
  return { id };
});
export const deleteAssistantAutomation = createServerFn({ method: "POST" }).middleware([requireAssistantAdmin]).inputValidator((input: unknown) => assistantDeleteAutomationInput.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("assistant_delete_automation", { p_id: data.id, p_confirmed: data.confirmed });
  if (error) throw new Error("Schedule could not be deleted.");
  return { deleted: true };
});