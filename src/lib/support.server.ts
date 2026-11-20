import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function hashVisitor(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export async function optionalOwner() {
  const header = getRequestHeader("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(header.slice(7));
  return error ? null : data.user?.id ?? null;
}
export async function publicVideo(id?: string) {
  if (!id) return null;
  const { data, error } = await supabaseAdmin.from("videos").select("id,title,thumbnail,status").eq("id", id).eq("status", "published").single();
  if (error || !data) throw new Error("Video unavailable.");
  return { id: data.id, title: data.title, thumbnail: data.thumbnail, url: `/watch/${encodeURIComponent(data.id)}` };
}
export async function ownConversation(id: string, token: string) {
  const hash = await hashVisitor(token);
  const owner = await optionalOwner();
  const { data, error } = await supabaseAdmin.from("contact_conversations").select("id,sender_hash,user_id").eq("id", id).single();
  if (error || !data || (data.sender_hash !== hash && (!owner || data.user_id !== owner))) throw new Error("Conversation unavailable.");
  return data.id;
}