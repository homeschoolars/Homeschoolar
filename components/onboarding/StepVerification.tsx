"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { FileUp, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useOnboarding } from "./onboarding-context"

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"

export function StepVerification() {
  const { state, dispatch } = useOnboarding()
  const inputRef = useRef<HTMLInputElement>(null)
  const [shake, setShake] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const uploadFile = (file: File) => {
    if (file.size >= MAX_BYTES) {
      dispatch({ type: "MERGE", patch: { errorMessage: "File must be under 10MB." } })
      triggerShake()
      return
    }
    const ok =
      file.type === "application/pdf" || file.type === "image/jpeg" || file.type === "image/png"
    if (!ok) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Use PDF, JPG, or PNG only." } })
      triggerShake()
      return
    }

    dispatch({
      type: "MERGE",
      patch: { certificateFile: file, errorMessage: null, uiState: "uploading", uploadProgress: 0 },
    })

    const form = new FormData()
    form.append("file", file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/onboarding/upload-certificate")
    xhr.withCredentials = true

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return
      const pct = Math.round((ev.loaded / ev.total) * 100)
      dispatch({ type: "MERGE", patch: { uploadProgress: pct } })
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; error?: string }
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          setFileName(file.name)
          dispatch({
            type: "MERGE",
            patch: {
              certificateUrl: data.url,
              uiState: "success",
              uploadProgress: 100,
              uploadRetries: 0,
              errorMessage: null,
            },
          })
          window.setTimeout(() => {
            dispatch({ type: "SET_STEP", step: 4 })
            dispatch({ type: "MERGE", patch: { uiState: "idle" } })
          }, 1500)
        } else {
          dispatch({ type: "INCREMENT_UPLOAD_RETRY" })
          dispatch({
            type: "MERGE",
            patch: {
              uiState: "error",
              errorMessage: "Something went wrong — please try again.",
            },
          })
          triggerShake()
        }
      } catch {
        dispatch({ type: "INCREMENT_UPLOAD_RETRY" })
        dispatch({
          type: "MERGE",
          patch: {
            uiState: "error",
            errorMessage: "Something went wrong — please try again.",
          },
        })
        triggerShake()
      }
    }

    xhr.onerror = () => {
      dispatch({ type: "INCREMENT_UPLOAD_RETRY" })
      dispatch({
        type: "MERGE",
        patch: {
          uiState: "error",
          errorMessage: "Something went wrong — please try again.",
        },
      })
      triggerShake()
    }

    xhr.send(form)
  }

  const showZone = state.uiState !== "success" && !state.certificateUrl
  const uploading = state.uiState === "uploading"

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900 font-[family-name:var(--font-heading)]">
        Unlock free education
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Drop your certificate here — we keep it secure.
      </p>

      <div className="mt-4 rounded-xl bg-[#e8f2ff] px-4 py-3 text-sm text-slate-700 border border-[#cfe4ff]">
        Upload the father&apos;s death certificate — reviewed within 24-48 hours.
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadFile(f)
          e.target.value = ""
        }}
      />

      {showZone && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ede8ff] bg-[#faf8ff] px-6 py-12 text-center transition-colors hover:border-[#7F77DD] hover:bg-[#EEEDFE]"
        >
          <Upload className="h-10 w-10 text-[#7F77DD]" />
          <span className="font-semibold text-slate-900">Upload Death Certificate</span>
          <span className="text-sm text-muted-foreground">PDF, JPG or PNG · Maximum 10MB</span>
        </button>
      )}

      {uploading && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-slate-700">Uploading… {state.uploadProgress}%</p>
          <Progress value={state.uploadProgress} className="h-2" />
        </div>
      )}

      {state.certificateUrl && state.uiState !== "uploading" && (
        <div className="mt-6 rounded-xl border border-[#c8e8d4] bg-[#EAF3DE] p-4">
          <div className="flex items-start gap-3">
            <FileUp className="h-5 w-5 shrink-0 text-[#1D9E75]" />
            <div>
              <p className="font-medium text-slate-900">{fileName ?? "Certificate uploaded"}</p>
              <Badge className="mt-2 bg-amber-500 text-white hover:bg-amber-500">Pending review</Badge>
            </div>
          </div>
        </div>
      )}

      {state.uiState === "error" && state.uploadRetries >= 2 && (
        <p className="mt-4 text-sm text-red-600">
          Please{" "}
          <a href="mailto:support@homeschoolar.com" className="font-medium text-[#7F77DD] underline">
            contact support
          </a>
          .
        </p>
      )}

      {state.errorMessage && state.uiState !== "uploading" && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-red-600">{state.errorMessage}</p>
          {state.uploadRetries < 2 && state.uiState === "error" && (
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()}>
              Try again
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 border border-amber-200">
        Verification in progress — you can start learning immediately while we review. We&apos;ll upgrade your plan
        automatically when approved.
      </div>

      {state.uiState === "success" && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Taking you to the next step…</p>
      )}
    </motion.div>
  )
}
