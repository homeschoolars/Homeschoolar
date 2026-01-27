import Link from "next/link"
import Image from "next/image"

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Homeschoolars" width={36} height={36} className="rounded-lg" />
          <span className="font-semibold text-slate-800">Homeschoolars</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
            Home
          </Link>
          <Link href="/blog" className="text-sm font-medium text-slate-900">
            Blog
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  )
}
