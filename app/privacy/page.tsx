import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-4 text-slate-700">
          We collect only the information required to provide and improve learning services for families.
        </p>
        <p className="mt-3 text-slate-700">
          We do not sell personal data. We apply reasonable safeguards to protect account and child profile
          information.
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
