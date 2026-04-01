import Link from "next/link"

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-4 text-slate-700">
          By using Homeschoolars, you agree to use the platform responsibly and provide accurate account details.
        </p>
        <p className="mt-3 text-slate-700">
          Paid plans renew based on the selected billing cycle unless cancelled according to the subscription terms.
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
