import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BlogNotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Article not found</h1>
      <p className="mt-2 text-slate-600">The post you’re looking for doesn’t exist or was removed.</p>
      <Button asChild className="mt-6">
        <Link href="/blog">Back to Blog</Link>
      </Button>
    </div>
  )
}
