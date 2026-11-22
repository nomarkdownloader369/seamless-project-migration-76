import { createFileRoute } from "@tanstack/react-router";
import { VideoPublisher } from "@/components/site/VideoPublisher";

export const Route = createFileRoute("/admin/publish")({
  head: () => ({ meta: [
    { title: "Video Importer — TABOOBOX" }, { name: "description", content: "Import and publish videos in the TABOOBOX archive." },
    { property: "og:title", content: "Video Importer — TABOOBOX" }, { property: "og:description", content: "Import and publish videos in the TABOOBOX archive." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: VideoPublisher,
});

