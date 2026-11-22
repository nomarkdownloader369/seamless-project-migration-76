import { z } from "zod";

export const assistantMessageInput = z.object({ threadId: z.string().uuid(), text: z.string().trim().min(1).max(20000) });
export const assistantClearInput = z.object({ threadId: z.string().uuid(), confirmed: z.literal(true) });
export const assistantThreadAction = z.object({ threadId: z.string().uuid(), action: z.enum(["rename", "delete"]), title: z.string().trim().max(120).default(""), confirmed: z.literal(true) }).refine((v) => v.action !== "rename" || v.title.length > 0, { message: "Add a conversation title" });
export const assistantTaskInput = z.object({ id: z.string().uuid(), command: z.string().trim().min(1).max(20000), kind: z.enum(["plan", "catalog_audit"]), threadId: z.string().uuid().optional(), confirmed: z.literal(true) });
export const assistantAutomationInput = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120), command: z.string().trim().min(1).max(20000), scheduledAt: z.string().datetime(), recurrence: z.enum(["once", "daily", "weekly"]), enabled: z.literal(false), confirmed: z.literal(true) });
export const assistantDeleteAutomationInput = z.object({ id: z.string().uuid(), confirmed: z.literal(true) });
export const taskStatuses = ["pending", "running", "completed", "failed"] as const;
export function canExecuteTask(kind: "plan" | "catalog_audit"): boolean { return kind === "catalog_audit"; }
export const assistantCapabilities = [
  { id: "videos", name: "Published videos", ar: "الفيديوهات المنشورة", permission: "read" },
  { id: "cloudfam", name: "CloudFam discovery & sync", ar: "اكتشاف ومزامنة CloudFam", permission: "read" },
  { id: "metadata", name: "Verified video metadata", ar: "بيانات الفيديو الموثّقة", permission: "prepare" },
  { id: "publish", name: "Review & publishing", ar: "المراجعة والنشر", permission: "confirm" },
  { id: "statistics", name: "Website statistics", ar: "إحصائيات الموقع", permission: "read" },
  { id: "content", name: "Categories & homepage", ar: "الأقسام والصفحة الرئيسية", permission: "confirm" },
  { id: "schedule", name: "Scheduled background tasks", ar: "المهام المجدولة", permission: "confirm" },
] as const;

/** Future adapters must authorize every call, verify source data, and log confirmed writes. */
export interface AssistantIntegration {
  status(): Promise<{ connected: boolean; lastSync: string | null }>;
  execute(input: { capability: typeof assistantCapabilities[number]["id"]; threadId: string; confirmationId?: string; signal: AbortSignal }): Promise<{ activityId: string; state: "pending" | "completed" | "failed" }>;
}