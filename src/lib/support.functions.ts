import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportSchema, conversationSchema, guestAccessSchema, guestMessageSchema, adminActionSchema, adminReplySchema } from "./support-contract";

const requireSupportAdmin = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ context, next }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Administrator access required.");
  return next();
});
export const submitVideoReport = createServerFn({ method: "POST" }).inputValidator((input: unknown) => reportSchema.parse(input)).handler(async ({ data }) => {
  const { hashVisitor, publicVideo } = await import("./support.server");
  const video = await publicVideo(data.videoId);
  if (!video) throw new Error("Video unavailable.");
  const hash = await hashVisitor(data.token);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("video_reports").insert({ video_id: video.id, video_title: video.title, video_url: video.url, thumbnail: video.thumbnail, reason: data.reason, sender_hash: hash }).select("id").single();
  if (error?.code === "23505") throw new Error("You have already reported this video.");
  if (error || !row) throw new Error("Report was not saved. Please try again.");
  return { id: row.id };
});
export const createContactConversation = createServerFn({ method: "POST" }).inputValidator((input: unknown) => conversationSchema.parse(input)).handler(async ({ data }) => {
  const { hashVisitor, optionalOwner, publicVideo } = await import("./support.server");
  const hash = await hashVisitor(data.token);
  const userId = await optionalOwner();
  const video = await publicVideo(data.videoId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: id, error } = await supabaseAdmin.rpc("support_create_contact", { p_hash: hash, p_user: userId ?? undefined, p_name: data.name, p_subject: data.subject, p_kind: data.kind, p_text: data.text, p_video_id: video?.id, p_video_title: video?.title, p_video_url: video?.url, p_thumbnail: video?.thumbnail ?? "" });
  if (error?.code === "23505") throw new Error("This request already exists in your conversations.");
  if (error || !id) throw new Error("Message was not saved. Please try again.");
  return { id };
});
export const getVisitorConversations = createServerFn({ method: "POST" }).inputValidator((input: unknown) => guestAccessSchema.parse(input)).handler(async ({ data }) => {
  const { hashVisitor, optionalOwner, ownConversation } = await import("./support.server");
  const hash = await hashVisitor(data.token);
  const owner = await optionalOwner();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const columns = "id,sender_name,subject,kind,video_id,video_title,video_url,thumbnail,sender_unread,created_at,updated_at" as const;
  if (data.id) {
    const id = await ownConversation(data.id, data.token);
    const { error: readError } = await supabaseAdmin.from("contact_conversations").update({ sender_unread: 0 }).eq("id", id);
    const { data: thread, error } = await supabaseAdmin.from("contact_conversations").select(columns).eq("id", id).single();
    const { data: messages, error: messageError } = await supabaseAdmin.from("contact_messages").select("id,role,text,created_at").eq("conversation_id", id).order("created_at").order("id");
    if (readError || error || messageError || !thread) throw new Error("Could not load conversation.");
    return { threads: [thread], messages: messages ?? [] };
  }
  let query = supabaseAdmin.from("contact_conversations").select(columns);
  query = owner ? query.or(`sender_hash.eq.${hash},user_id.eq.${owner}`) : query.eq("sender_hash", hash);
  const { data: threads, error } = await query.order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error("Could not load conversations.");
  return { threads: threads ?? [], messages: [] };
});
export const sendVisitorMessage = createServerFn({ method: "POST" }).inputValidator((input: unknown) => guestMessageSchema.parse(input)).handler(async ({ data }) => {
  const { ownConversation } = await import("./support.server");
  const id = await ownConversation(data.id, data.token);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("contact_messages").insert({ conversation_id: id, role: "sender", text: data.text }).select("id").single();
  if (error?.code === "23505") throw new Error("This message has already been sent.");
  if (error || !row) throw new Error("Message was not saved.");
  return { id: row.id };
});
export const getSupportInbox = createServerFn({ method: "POST" }).middleware([requireSupportAdmin]).handler(async ({ context }) => {
  const [reports, conversations, activity] = await Promise.all([
    context.supabase.from("video_reports").select("id,video_id,video_title,video_url,thumbnail,reason,status,created_at").order("created_at", { ascending: false }).limit(500),
    context.supabase.from("contact_conversations").select("id,sender_name,subject,kind,video_id,video_title,video_url,thumbnail,admin_unread,created_at,updated_at").order("updated_at", { ascending: false }).limit(500),
    context.supabase.from("support_activity").select("id,action,target_id,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (reports.error || conversations.error || activity.error) throw new Error("Could not load inbox.");
  return { reports: reports.data ?? [], conversations: conversations.data ?? [], activity: activity.data ?? [] };
});
export const actOnVideoReport = createServerFn({ method: "POST" }).middleware([requireSupportAdmin]).inputValidator((input: unknown) => adminActionSchema.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("support_report_action", { p_id: data.id, p_action: data.action, p_confirmed: data.confirmed });
  if (error) throw new Error("Action was not completed.");
  return { saved: true };
});
export const getAdminContact = createServerFn({ method: "POST" }).middleware([requireSupportAdmin]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { error: readError } = await context.supabase.rpc("support_admin_read", { p_id: data.id });
  const { data: messages, error } = await context.supabase.from("contact_messages").select("id,role,text,created_at").eq("conversation_id", data.id).order("created_at").order("id");
  if (error || readError) throw new Error("Could not load messages.");
  return messages ?? [];
});
export const replyToContact = createServerFn({ method: "POST" }).middleware([requireSupportAdmin]).inputValidator((input: unknown) => adminReplySchema.parse(input)).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from("contact_messages").insert({ conversation_id: data.id, role: "admin", text: data.text }).select("id").single();
  if (error || !row) throw new Error("Reply was not saved.");
  return { id: row.id };
});