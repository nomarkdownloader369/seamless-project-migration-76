import { createFileRoute } from "@tanstack/react-router";
import { ContactWorkspace } from "@/components/site/ContactWorkspace";
export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): { video?: string } => ({ video: typeof s.video === "string" && s.video.length <= 200 ? s.video : undefined }),
  head: () => ({ meta: [{ title: "Contact & Video Requests — TABOOBOX" }, { name: "description", content: "Private messages and video requests to TABOOBOX administrators." }, { property: "og:title", content: "Contact & Video Requests — TABOOBOX" }, { property: "og:description", content: "Private messages and video requests to TABOOBOX administrators." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Contact,
});
function Contact() { const { video } = Route.useSearch(); return <ContactWorkspace videoId={video} />; }