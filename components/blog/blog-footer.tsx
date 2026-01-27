import Link from "next/link"
import Image from "next/image"

export function BlogFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Homeschoolars" width={32} height={32} className="rounded-lg" />
            <span className="font-semibold text-slate-800">Homeschoolars</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <Link href="/blog" className="hover:text-slate-900">Blog</Link>
            <Link href="/login" className="hover:text-slate-900">Log in</Link>
            <Link href="/signup" className="hover:text-slate-900">Sign up</Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Homeschoolars. Raising thinkers, not just students.
        </p>
      </div>
    </footer>
  )
}
