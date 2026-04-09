"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

type Props = {
  familyRole: string | null
  fatherStatus: string | null
  guardianVerificationStatus: string
  eligibleForFreeEducation: boolean
  subscriptionIsOrphan: boolean
}

export function GuardianVerificationBanner({
  familyRole,
  fatherStatus,
  guardianVerificationStatus,
  eligibleForFreeEducation,
  subscriptionIsOrphan,
}: Props) {
  const router = useRouter()
  const { update } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (familyRole !== "guardian" || fatherStatus !== "deceased") {
    return null
  }

  const showActivated =
    (guardianVerificationStatus === "verified" && (eligibleForFreeEducation || subscriptionIsOrphan)) ||
    subscriptionIsOrphan

  if (showActivated) {
    return (
      <div className="mb-8 rounded-2xl border border-[#c8e8d4] bg-[#EAF3DE] px-5 py-4 text-sm text-slate-800">
        Your free education plan has been activated!
      </div>
    )
  }

  if (guardianVerificationStatus === "pending") {
    return (
      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        Verification in progress — full access meanwhile. We&apos;ll confirm your free plan when review is complete.
      </div>
    )
  }

  if (guardianVerificationStatus === "rejected") {
    const onFile = async (f: File | undefined) => {
      if (!f) return
      setErr(null)
      if (f.size > 10 * 1024 * 1024) {
        setErr("File must be under 10MB.")
        return
      }
      const ok =
        f.type === "application/pdf" || f.type === "image/jpeg" || f.type === "image/png"
      if (!ok) {
        setErr("Use PDF, JPG, or PNG.")
        return
      }
      setBusy(true)
      try {
        const form = new FormData()
        form.append("file", f)
        const res = await fetch("/api/onboarding/upload-certificate", {
          method: "POST",
          body: form,
          credentials: "include",
        })
        if (!res.ok) {
          setErr("Something went wrong — please try again.")
          return
        }
        await update({ user: { guardianVerificationStatus: "pending" } })
        router.refresh()
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    }

    return (
      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-950">
        <p className="font-medium">We couldn&apos;t verify your previous document.</p>
        <p className="mt-1 text-red-900/90">
          Upload a clearer death certificate (PDF, JPG, or PNG). You keep full access while we review again.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 border-red-300 bg-white"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Uploading…" : "Upload again"}
        </Button>
        {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
      </div>
    )
  }

  return null
}
