import { createFileRoute } from "@tanstack/react-router";
import { AssistantWorkspace } from "@/components/site/AssistantWorkspace";
export const Route = createFileRoute("/admin/assistant")({
  ssr: false,
  head: () => ({ meta: [{ title: "AI Assistant — PUREXDARK" }, { name: "description", content: "Private PUREXDARK administrator assistant and automation workspace." }, { property: "og:title", content: "AI Assistant — PUREXDARK" }, { property: "og:description", content: "Private PUREXDARK administrator assistant and automation workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AssistantWorkspace,
});