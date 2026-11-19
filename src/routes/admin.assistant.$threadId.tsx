import { createFileRoute } from "@tanstack/react-router";
import { AssistantChat } from "@/components/site/AssistantChat";
export const Route = createFileRoute("/admin/assistant/$threadId")({
  head: () => ({ meta: [{ title: "Assistant Chat — PUREXDARK" }, { name: "description", content: "Private PUREXDARK administrator conversation." }, { property: "og:title", content: "Assistant Chat — PUREXDARK" }, { property: "og:description", content: "Private PUREXDARK administrator conversation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ThreadPage,
});
function ThreadPage() {
  const { threadId } = Route.useParams();
  return <AssistantChat key={threadId} threadId={threadId} />;
}