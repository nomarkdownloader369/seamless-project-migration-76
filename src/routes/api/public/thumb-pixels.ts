import { createFileRoute } from "@tanstack/react-router";

// Same-origin image relay used only so the browser can read thumbnail pixels for collage detection.
function allowed(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    const h = u.hostname;
    if (h === "localhost" || /^[\d.]+$/.test(h) || h.includes(":") || h.endsWith(".internal") || h.endsWith(".local")) return null;
    return u;
  } catch { return null; }
}

export const Route = createFileRoute("/api/public/thumb-pixels")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = allowed(new URL(request.url).searchParams.get("url"));
        if (!target) return new Response("Bad url", { status: 400 });
        try {
          const r = await fetch(target.href, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Accept: "image/*" } });
          const type = r.headers.get("content-type") ?? "";
          const len = Number(r.headers.get("content-length") ?? 0);
          if (!r.ok || !type.startsWith("image/") || len > 8_000_000) { await r.body?.cancel(); return new Response("Unavailable", { status: 502 }); }
          return new Response(r.body, { headers: { "content-type": type, "cache-control": "public, max-age=86400" } });
        } catch { return new Response("Unavailable", { status: 502 }); }
      },
    },
  },
});
