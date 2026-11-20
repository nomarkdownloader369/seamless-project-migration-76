import { createFileRoute } from "@tanstack/react-router";
import { AssistantEmpty } from "@/components/site/AssistantChat";
export const Route = createFileRoute("/admin/assistant/")({
  head: () => ({ meta: [{ title: "Assistant Conversations — TABOOBOX" }, { name: "description", content: "Private saved administrator conversations in TABOOBOX." }, { property: "og:title", content: "Assistant Conversations — TABOOBOX" }, { property: "og:description", content: "Private saved administrator conversations in TABOOBOX." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AssistantEmpty,
});