import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/site/AdminGate";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — TABOOBOX" }, { name: "description", content: "Private administrator area." }, { property: "og:title", content: "Admin — TABOOBOX" }, { property: "og:description", content: "Private administrator area." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AdminShell,
});
