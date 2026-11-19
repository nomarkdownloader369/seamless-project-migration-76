<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->


## Application architecture
- Assistant history is isolated in admin-owner-scoped Cloud tables and authenticated admin functions; disconnected adapters never generate responses or execute tasks. Future model streaming must persist complete UIMessage parts and confirmation-gated operations must produce durable activity records.
- Assistant threads use dedicated route IDs and keyed chat views; this prevents conversations from bleeding together and restores the same history on reload.
- Preserve the imported TanStack file routes and shared providers; this keeps original URLs and bilingual navigation stable.
- Keep database access on the generated Cloud client and enforce admin permissions in RLS and authenticated server functions; browser gates are presentation only.
- Keep source sample videos separate from imported production records; absent exports must never be presented as migrated records.
- Use the AI Gateway SDK inside the authorized metadata handler and preserve the source model; this keeps inference server-only.
- Link migrated identities only through server-controlled verified email ownership; source IDs and roles are never trusted from browser input.

- Card thumbnails never mount provider iframes; only the viewing route embeds players to prevent provider ads in listings.
- Gate catalog responses by request version and fetch after auth settles; stale reads must not replace newly saved videos.
- Provider fetches use manual redirects and reject redirects; the hosted runtime does not support redirect error mode.
- Use the shared Thumb for previews: contain genuine portraits and fill detected collages without extra scaling; this preserves portrait proportions and avoids unnecessary collage zoom.
- Refresh unknown Cloudfam catalog quality from measured file metadata with bounded concurrency and request-version guards; existing records gain truthful badges without stale reads or guessed labels.
- Keep publishing as import, review, then publish with optional AI generation and one shared busy state; this avoids duplicate actions and concurrent submissions.
- Parse bulk embeds with a non-executing HTML parser and canonical URL deduplication; multiline HTML must produce independent safe entries.
- Store publisher tags alongside captions in the existing video description; this preserves tags without changing other pages or the schema.
- Suppress catalog reads during inserts and confirm returned row IDs before removing review items; only persisted rows count as published.
