import { z } from "zod";

export const guestTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const reportSchema = z.object({ token: guestTokenSchema, videoId: z.string().trim().min(1).max(200), reason: z.string().trim().min(1).max(2000), website: z.string().max(0).default("") });
export const conversationSchema = z.object({ token: guestTokenSchema, name: z.string().trim().min(1).max(80), subject: z.string().trim().min(1).max(160), kind: z.enum(["question", "part", "series", "suggestion"]), videoId: z.string().trim().max(200).optional(), text: z.string().trim().min(1).max(4000), website: z.string().max(0).default("") });
export const guestAccessSchema = z.object({ token: guestTokenSchema, id: z.string().uuid().optional() });
export const guestMessageSchema = z.object({ token: guestTokenSchema, id: z.string().uuid(), text: z.string().trim().min(1).max(4000) });
export const adminActionSchema = z.object({ id: z.string().uuid(), action: z.enum(["reviewed", "dismissed", "delete"]), confirmed: z.boolean().default(false) }).refine(d => d.action !== "delete" || d.confirmed, { message: "Deletion requires confirmation" });
export const adminReplySchema = z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(4000) });

export function storedGuestToken(): string {
  const old = localStorage.getItem("taboobox-visitor-key");
  if (guestTokenSchema.safeParse(old).success && old) return old;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("taboobox-visitor-key", token);
  return token;
}