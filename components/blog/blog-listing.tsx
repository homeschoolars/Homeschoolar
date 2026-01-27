"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Calendar, User, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"

type Category = { id: string; name: string; slug: string; display_order?: number; post_count: number }
type PostItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  view_count: number
  category: { id: string; name: string; slug: string }
  author_name: string | null
}

type ListingData = {
  posts: PostItem[]
  featured: PostItem | null
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface BlogListingProps {
  initialData: ListingData | null
  categories: Category[]
}

export function BlogListing({ initialData, categories }: BlogListingProps) {
  const [data, setData] = useState<ListingData | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(initialData?.page ?? 1)
  const [category, setCategory] = useState<string>("")
  const [q, setQ] = useState("")

  const fetchPage = useCallback(
    async (p: number, cat: string, search: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("page", String(p))
        if (cat) params.set("category", cat)
        if (search.trim()) params.set("q", search.trim())
        const res = await fetch(`/api/blog?${params}`)
        const json = (await res.json()) as ListingData
        setData(json)
        setPage(json.page)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!initialData) {
      fetchPage(1, "", "")
      return
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPage(1, category, q)
  }

  const handleCategory = (slug: string) => {
    const next = category === slug ? "" : slug
    setCategory(next)
    fetchPage(1, next, q)
  }

  const goPage = (p: number) => {
    if (p < 1 || (data && p > data.total_pages)) return
    fetchPage(p, category, q)
  }

  const featured = data?.featured ?? null
  const posts = data?.posts ?? []
  const totalPages = data?.total_pages ?? 1

  return (
    <div className="container mx-auto px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Blog</h1>
        <p className="mt-3 text-slate-600">
          Parenting tips, learning advice, and updates from Homeschoolars.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mx-auto max-w-2xl mb-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search articles..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 border-slate-200"
            />
          </div>
          <Button type="submit" variant="outline" className="border-slate-200">
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-10 justify-center">
        <Button
          variant={category === "" ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategory("")}
          className={category === "" ? "bg-slate-800 hover:bg-slate-900" : "border-slate-200"}
        >
          All
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={category === c.slug ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategory(c.slug)}
            className={category === c.slug ? "bg-slate-800 hover:bg-slate-900" : "border-slate-200"}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {loading && !data ? (
        <div className="space-y-8">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {featured && page === 1 && !q && !category && (
            <Link href={`/blog/${featured.slug}`} className="block mb-12 group">
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-shadow hover:shadow-lg">
                <div className="grid sm:grid-cols-2 gap-0">
                  <div className="relative aspect-video sm:aspect-auto sm:min-h-[280px]">
                    {featured.featured_image ? (
                      <Image
                        src={featured.featured_image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-200" />
                    )}
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <span className="text-sm font-medium text-teal-600">{featured.category.name}</span>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-teal-700">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="mt-2 text-slate-600 line-clamp-2">{featured.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                      {featured.author_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {featured.author_name}
                        </span>
                      )}
                      {featured.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(featured.published_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          )}

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-slate-600">No articles found.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setCategory(""); setQ(""); fetchPage(1, "", ""); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group block">
                  <article className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                    <div className="relative aspect-video">
                      {p.featured_image ? (
                        <Image
                          src={p.featured_image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-100" />
                      )}
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-medium text-teal-600">{p.category.name}</span>
                      <h3 className="mt-1 font-semibold text-slate-900 group-hover:text-teal-700 line-clamp-2">
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.excerpt}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                        {p.author_name && <span>{p.author_name}</span>}
                        {p.published_at && (
                          <span>{formatDistanceToNow(new Date(p.published_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goPage(page - 1)}
                disabled={page <= 1 || loading}
                className="border-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="border-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
