import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATS = ["action", "drama", "thriller", "horror", "documentary", "music", "sports", "classic"];

export const generateVideoMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ embed: z.string().url().max(500), thumbnail: z.string().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can generate metadata.");
    const { generateChatCompletion } = await import("@lovable.dev/ai-gateway");
    const json = await generateChatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write short catchy video titles and descriptions in English and Egyptian Arabic (colloquial). Base them on the thumbnail when given." },
          { role: "user", content: [{ type: "text", text: `Video embed URL: ${data.embed}\nWrite metadata for this video for a dark cinematic video site.` }, ...(data.thumbnail.startsWith("https://") ? [{ type: "image_url" as const, image_url: { url: data.thumbnail } }] : [])] },
        ],
        tools: [{ type: "function", function: { name: "save_metadata", parameters: {
          type: "object", required: ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "category", "tags"],
          properties: {
            titleEn: { type: "string" }, titleAr: { type: "string" }, descriptionEn: { type: "string" }, descriptionAr: { type: "string" },
            category: { type: "string", enum: CATS }, tags: { type: "array", items: { type: "string" } },
          },
        } } }],
        tool_choice: { type: "function", function: { name: "save_metadata" } },
    });
    const tool = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = tool && "function" in tool ? tool.function.arguments : undefined;
    if (!args) throw new Error("AI returned no metadata.");
    const m = z.object({ titleEn: z.string(), titleAr: z.string(), descriptionEn: z.string(), descriptionAr: z.string(), category: z.string(), tags: z.array(z.string()) }).parse(JSON.parse(args));
    return {
      titleEn: String(m.titleEn ?? ""), titleAr: String(m.titleAr ?? ""), descriptionEn: String(m.descriptionEn ?? ""),
      descriptionAr: String(m.descriptionAr ?? ""), category: CATS.includes(m.category) ? m.category : "classic",
      tags: Array.isArray(m.tags) ? m.tags.map(String).slice(0, 10) : [],
    };
  });
