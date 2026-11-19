import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assistantMessageInput, assistantClearInput } from "./assistant-contract";

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