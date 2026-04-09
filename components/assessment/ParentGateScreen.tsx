"use client"

import { useState } from "react"
import { Phone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-client"

type Props = {
  childId: string
  childName: string
  onVerified: () => void
}

export function ParentGateScreen({ childId, childName, onVerified }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/verify-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, email: email.trim(), password }),
        credentials: "include",
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — please try again.")
        return
      }
      onVerified()
    } catch {
      setError("Something went wrong — please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f6ff] overflow-y-auto">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:py-14">
        <div
          className="mb-8 h-40 w-full rounded-3xl bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7F77DD] shadow-lg shadow-[#7F77DD]/25"
          aria-hidden
        />

        <h1 className="text-center text-2xl font-bold text-slate-900 font-[family-name:var(--font-heading)]">
          Time to meet your learning guide!
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 leading-relaxed">
          This quiz helps us personalise <span className="font-semibold text-[#7F77DD]">{childName}</span>&apos;s journey
        </p>

        <div className="mt-8 rounded-2xl border-2 border-[#ede8ff] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#7F77DD]">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Please call your parent — this part is for grown-ups!</p>
              <p className="mt-1 text-sm text-slate-600">
                A parent needs to sign in below. Then you can continue together.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-800">Parent login</p>
          <div className="space-y-2">
            <Label htmlFor="pg-email">Email</Label>
            <Input
              id="pg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-[#ede8ff]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-password">Password</Label>
            <Input
              id="pg-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-[#ede8ff]"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white h-12 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & Start Assessment"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
