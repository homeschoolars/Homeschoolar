import Link from "next/link"

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Careers</h1>
        <p className="mt-4 text-slate-700">
          We are building tools that help families teach with confidence. If you care about education, product, and
          impact, we would love to hear from you.
        </p>
        <p className="mt-3 text-slate-700">For opportunities, email us at careers@homeschoolars.com.</p>
        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
