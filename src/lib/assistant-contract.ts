import { z } from "zod";

export const assistantMessageInput = z.object({ threadId: z.string().uuid(), text: z.string().trim().min(1).max(20000) });
export const assistantClearInput = z.object({ threadId: z.string().uuid(), confirmed: z.literal(true) });
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