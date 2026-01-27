"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-client"
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  FolderOpen,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Category = {
  id: string
  name: string
  slug: string
  display_order?: number
  post_count: number
}

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  status: "draft" | "published"
  published_at: string | null
  view_count: number
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  category: { id: string; name: string; slug: string }
  author: { id: string; name: string } | null
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function BlogManagement() {
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category_id: "",
    featured_image: "",
    status: "draft" as "draft" | "published",
    published_at: "",
    meta_title: "",
    meta_description: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [postsRes, catRes] = await Promise.all([
        apiFetch(
          `/api/admin/blog?page=${page}${statusFilter ? `&status=${statusFilter}` : ""}`
        ),
        apiFetch("/api/admin/blog/categories"),
      ])
      if (postsRes.ok) {
        const j = (await postsRes.json()) as {
          posts: Post[]
          total: number
          page: number
        }
        setPosts(j.posts)
        setTotal(j.total)
      }
      if (catRes.ok) {
        const j = (await catRes.json()) as { categories: Category[] }
        setCategories(j.categories ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category_id: categories[0]?.id ?? "",
      featured_image: "",
      status: "draft",
      published_at: "",
      meta_title: "",
      meta_description: "",
    })
    setDialogOpen(true)
  }

  const openEdit = async (id: string) => {
    const res = await apiFetch(`/api/admin/blog/${id}`)
    if (!res.ok) return
    const j = (await res.json()) as { post: Post & { content?: string; category_id?: string } }
    const p = j.post
    setEditingId(id)
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content ?? "",
      excerpt: p.excerpt ?? "",
      category_id: p.category_id ?? p.category.id,
      featured_image: p.featured_image ?? "",
      status: p.status,
      published_at: p.published_at
        ? new Date(p.published_at).toISOString().slice(0, 16)
        : "",
      meta_title: p.meta_title ?? "",
      meta_description: p.meta_description ?? "",
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.category_id) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        content: form.content,
        excerpt: form.excerpt.trim() || undefined,
        category_id: form.category_id,
        featured_image: form.featured_image.trim() || undefined,
        status: form.status,
        published_at: form.published_at || undefined,
        meta_title: form.meta_title.trim() || undefined,
        meta_description: form.meta_description.trim() || undefined,
      }
      if (editingId) {
        const res = await apiFetch(`/api/admin/blog/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          load()
        }
      } else {
        const res = await apiFetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          load()
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return
    const res = await apiFetch(`/api/admin/blog/${id}`, { method: "DELETE" })
    if (res.ok) load()
  }

  const preview = (slug: string, status: string) => {
    if (status !== "published") return
    window.open(`/blog/${slug}`, "_blank", "noopener")
  }

  return (
    <div className="space-y-8">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Blog posts
          </CardTitle>
          <CardDescription>Create, edit, and manage blog articles. Draft vs published.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={openCreate} className="bg-slate-800 hover:bg-slate-900">
              <Plus className="h-4 w-4 mr-2" />
              New post
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 border-slate-200">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No posts. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {p.title}
                        </TableCell>
                        <TableCell>{p.category.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === "published" ? "default" : "secondary"}
                            className={p.status === "published" ? "bg-green-600" : ""}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.view_count}</TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => preview(p.slug, p.status)}
                              disabled={p.status !== "published"}
                              title={p.status === "published" ? "Preview" : "Publish first to preview"}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(p.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => remove(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>Parenting, Learning Tips, AI in Education, Product Updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-slate-700">
                {c.name} ({c.post_count})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit post" : "New post"}</DialogTitle>
            <DialogDescription>
              Markdown supported. Use slug for clean URLs. Set status and optional publish date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="col-span-1">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug || slugify(e.target.value),
                  }))
                }
                className="col-span-3 border-slate-200"
                placeholder="Post title"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="col-span-1">URL slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="col-span-3 border-slate-200"
                placeholder="url-slug"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="col-span-1">Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
              >
                <SelectTrigger className="col-span-3 border-slate-200">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="col-span-1">Content (Markdown)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="col-span-3 min-h-[200px] font-mono text-sm border-slate-200"
                placeholder="## Heading\n\nParagraph..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="excerpt" className="col-span-1">Excerpt</Label>
              <Input
                id="excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className="col-span-3 border-slate-200"
                placeholder="Short summary"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="featured" className="col-span-1">Featured image URL</Label>
              <Input
                id="featured"
                value={form.featured_image}
                onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))}
                className="col-span-3 border-slate-200"
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="col-span-1">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: "draft" | "published") =>
                  setForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger className="col-span-3 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pub" className="col-span-1">Publish at</Label>
              <Input
                id="pub"
                type="datetime-local"
                value={form.published_at}
                onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                className="col-span-3 border-slate-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meta_title" className="col-span-1">Meta title</Label>
              <Input
                id="meta_title"
                value={form.meta_title}
                onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                className="col-span-3 border-slate-200"
                placeholder="SEO title"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meta_desc" className="col-span-1">Meta description</Label>
              <Input
                id="meta_desc"
                value={form.meta_description}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                className="col-span-3 border-slate-200"
                placeholder="SEO description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.title.trim() || !form.category_id}
              className="bg-slate-800 hover:bg-slate-900"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
