"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Check, ChevronsUpDown, Heart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries"
import { getNextStep } from "@/lib/onboarding/step-routing"
import { apiFetch } from "@/lib/api-client"
import { useOnboarding } from "./onboarding-context"

const RELIGIONS = [
  "Islam",
  "Christianity",
  "Judaism",
  "Hinduism",
  "Buddhism",
  "Sikhism",
  "Other",
  "Prefer not to say",
] as const

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export function StepRegistration() {
  const { state, dispatch, tryLoadDraftForEmail } = useOnboarding()
  const [countryOpen, setCountryOpen] = useState(false)
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const onContinue = async () => {
    dispatch({ type: "MERGE", patch: { errorMessage: null } })

    if (!state.name.trim()) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please enter your full name." } })
      triggerShake()
      return
    }
    if (!emailOk(state.email)) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please enter a valid email address." } })
      triggerShake()
      return
    }
    if (state.password.length < 8) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Password must be at least 8 characters." } })
      triggerShake()
      return
    }
    if (state.phone.trim().length < 6) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please enter a valid phone number." } })
      triggerShake()
      return
    }
    if (!state.country.trim()) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please choose your country." } })
      triggerShake()
      return
    }
    if (!state.religion) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please select a religion option." } })
      triggerShake()
      return
    }
    if (!state.role) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please choose Parent or Guardian." } })
      triggerShake()
      return
    }

    dispatch({ type: "MERGE", patch: { uiState: "loading" } })

    try {
      const res = await apiFetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          email: state.email.trim(),
          password: state.password,
          phone: state.phone.trim(),
          country: state.country.trim(),
          religion: state.religion,
          role: state.role,
        }),
      })
      const data = (await res.json()) as { userId?: string; error?: string; code?: string }

      if (!res.ok) {
        if (data.code === "EMAIL_EXISTS") {
          dispatch({
            type: "MERGE",
            patch: {
              uiState: "error",
              errorMessage: "This email is already registered — try logging in instead.",
            },
          })
          triggerShake()
          return
        }
        dispatch({
          type: "MERGE",
          patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
        })
        triggerShake()
        return
      }

      const sign = await signIn("credentials", {
        email: state.email.trim(),
        password: state.password,
        redirect: false,
      })
      if (sign?.error) {
        dispatch({
          type: "MERGE",
          patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
        })
        triggerShake()
        return
      }

      const next = getNextStep({
        ...state,
        userId: data.userId ?? null,
      })
      dispatch({
        type: "MERGE",
        patch: {
          userId: data.userId ?? null,
          uiState: "idle",
          errorMessage: null,
          step: next,
        },
      })
    } catch {
      dispatch({
        type: "MERGE",
        patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
      })
      triggerShake()
    }
  }

  const countryLabel =
    COUNTRY_OPTIONS.find((c) => c.name === state.country || c.code === state.country)?.name ?? state.country

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900 font-[family-name:var(--font-heading)]">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Almost there — tell us a bit about you.</p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ob-name">Full name</Label>
          <Input
            id="ob-name"
            value={state.name}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "name", value: e.target.value })}
            placeholder="Your name"
            className="rounded-xl border-[#ede8ff]"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ob-email">Email</Label>
            <button
              type="button"
              className="text-xs text-[#7F77DD] hover:underline"
              onClick={() => {
                if (!state.email.trim()) return
                if (window.confirm("Continue where you left off with this email?")) {
                  tryLoadDraftForEmail(state.email)
                }
              }}
            >
              Resume draft
            </button>
          </div>
          <Input
            id="ob-email"
            type="email"
            autoComplete="email"
            value={state.email}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "email", value: e.target.value })}
            placeholder="you@example.com"
            className="rounded-xl border-[#ede8ff]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ob-password">Password</Label>
          <Input
            id="ob-password"
            type="password"
            autoComplete="new-password"
            value={state.password}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "password", value: e.target.value })}
            placeholder="At least 8 characters"
            className="rounded-xl border-[#ede8ff]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ob-phone">Phone</Label>
          <Input
            id="ob-phone"
            type="tel"
            value={state.phone}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "phone", value: e.target.value })}
            placeholder="+1 …"
            className="rounded-xl border-[#ede8ff]"
          />
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between rounded-xl border-[#ede8ff] font-normal"
              >
                {countryLabel || "Search countries…"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search country…" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {COUNTRY_OPTIONS.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={`${c.name} ${c.code}`}
                        onSelect={() => {
                          dispatch({ type: "SET_FIELD", field: "country", value: c.name })
                          setCountryOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            state.country === c.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Religion</Label>
          <Select
            value={state.religion}
            onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "religion", value: v })}
          >
            <SelectTrigger className="rounded-xl border-[#ede8ff]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {RELIGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Your role</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "parent" as const,
                  title: "Parent",
                  desc: "I am the child's parent",
                  icon: Heart,
                },
                {
                  id: "guardian" as const,
                  title: "Guardian",
                  desc: "I care for the child",
                  icon: Users,
                },
              ] as const
            ).map(({ id, title, desc, icon: Icon }) => {
              const selected = state.role === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => dispatch({ type: "SET_FIELD", field: "role", value: id })}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-colors",
                    selected
                      ? "border-[#7F77DD] bg-[#EEEDFE]"
                      : "border-[#ede8ff] bg-white hover:border-[#d8cffc]",
                  )}
                >
                  <Icon className={cn("h-6 w-6", selected ? "text-[#7F77DD]" : "text-slate-400")} />
                  <span className="font-semibold text-slate-900">{title}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {state.errorMessage && (
        <p className="mt-4 text-sm text-red-600">
          {state.errorMessage}
          {state.errorMessage.includes("logging in") && (
            <>
              {" "}
              <Link href="/login" className="font-medium text-[#7F77DD] underline">
                Login instead
              </Link>
            </>
          )}
        </p>
      )}

      <Button
        type="button"
        className="mt-6 w-full rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white"
        disabled={state.uiState === "loading"}
        onClick={onContinue}
      >
        {state.uiState === "loading" ? (
          <>
            <Spinner className="mr-2 text-white" />
            Please wait…
          </>
        ) : (
          "Continue →"
        )}
      </Button>
    </motion.div>
  )
}
