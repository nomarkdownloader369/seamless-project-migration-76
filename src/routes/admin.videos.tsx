import { Button } from "@/components/ui/button";
import { Thumb } from "@/components/site/Thumb";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, X, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Video, type CategoryId } from "@/lib/videos";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/videos")({
  head: () => ({ meta: [
    { title: "Manage Videos — PUREXDARK" }, { name: "description", content: "Edit videos and manage publication in the PUREXDARK archive." },
    { property: "og:title", content: "Manage Videos — PUREXDARK" }, { property: "og:description", content: "Edit videos and manage publication in the PUREXDARK archive." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: Manage,
});

const field = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary";

function Manage() {
  const { videos, updateVideo, deleteVideo } = useStore();
  const [editing, setEditing] = useState<Video | null>(null);
  const [toDelete, setToDelete] = useState<Video | null>(null);
  const [q, setQ] = useState("");
  const list = videos.filter((v) => v.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="font-display text-2xl font-bold uppercase">Manage videos <span className="text-sm text-muted-foreground">{list.length}</span></h2><Button asChild variant="ai"><Link to="/admin/publish"><Plus />Add videos</Link></Button></div>
      <div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search videos" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos…" className={`${field} ps-9`} /></div>
      <ul className="panel divide-y overflow-hidden">
        {list.map((v) => (
          <li key={v.id} className="flex items-center gap-2 p-3 sm:gap-3">
            <div className="aspect-video w-20 sm:w-24 shrink-0 overflow-hidden rounded bg-surface-2"><Thumb src={v.thumbnail} embed={v.embedUrl} alt="" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{v.title}</p>
              <p className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.id === v.category)?.en} · <span className={v.status === "published" ? "text-success" : "text-warning"}>{v.status}</span></p>
            </div>
            <Button variant="secondary" size="icon" aria-label={v.status === "published" ? "Unpublish" : "Publish"} title={v.status === "published" ? "Unpublish" : "Publish"} onClick={() => updateVideo(v.id, { status: v.status === "published" ? "pending" : "published" })}>
              {v.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="icon" aria-label="Edit video" title="Edit" onClick={() => setEditing(v)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Delete video" title="Delete" onClick={() => setToDelete(v)} className="text-primary"><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="py-8 text-center text-sm text-muted-foreground">No videos found.</p>}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay md:items-center">
          <form onSubmit={(e) => { e.preventDefault(); updateVideo(editing.id, editing); setEditing(null); }}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl border bg-card p-5 md:rounded-2xl">
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold uppercase">Edit video</h3><Button variant="ghost" size="icon" aria-label="Close editor" type="button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></Button></div>
            <div className="aspect-video w-full overflow-hidden rounded bg-surface-2"><Thumb key={editing.thumbnail} src={editing.thumbnail} embed={editing.embedUrl} alt="" /></div>
            <label className="block text-xs font-semibold text-muted-foreground">Thumbnail URL<input className={field} value={editing.thumbnail} onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Title<input className={field} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Arabic title<input dir="rtl" className={field} value={editing.titleAr} onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Description<textarea rows={3} className={`${field} h-auto py-2`} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Duration (e.g. 12:34)<input dir="ltr" className={field} value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Category
              <select className={field} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as CategoryId })}>
                {CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.status === "published"} onChange={(e) => setEditing({ ...editing, status: e.target.checked ? "published" : "pending" })} />Published</label>
            <Button className="h-11 w-full">Save changes</Button>
          </form>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.title}" will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary text-primary-foreground" onClick={() => { if (toDelete) { deleteVideo(toDelete.id); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
