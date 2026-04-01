import Link from "next/link"

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
        <p className="mt-4 text-slate-700">
          Need help with your account, billing, or onboarding? Reach us at support@homeschoolars.com.
        </p>
        <p className="mt-3 text-slate-700">We typically respond within 1-2 business days.</p>
        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
