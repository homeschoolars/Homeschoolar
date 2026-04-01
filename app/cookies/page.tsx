import Link from "next/link"

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Cookie Policy</h1>
        <p className="mt-4 text-slate-700">
          We use cookies and similar technologies to keep you signed in, improve performance, and understand product
          usage.
        </p>
        <p className="mt-3 text-slate-700">
          You can control cookies through your browser settings, though some site features may be limited.
        </p>
        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
