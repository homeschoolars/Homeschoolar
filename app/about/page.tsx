import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">About Homeschoolars</h1>
        <p className="mt-4 text-slate-700">
          Homeschoolars helps families deliver personalized, joyful learning at home with adaptive lesson support,
          worksheet generation, and progress tools.
        </p>
        <p className="mt-3 text-slate-700">
          Our goal is to make homeschooling easier for parents and more engaging for children.
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
