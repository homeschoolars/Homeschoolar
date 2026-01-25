"use client"

import type React from "react"

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Sparkles, Star, Users, GraduationCap, Loader2 } from "lucide-react"
import { signIn, getSession } from "next-auth/react"
import { apiFetch } from "@/lib/api-client"

function LoginContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [resendError, setResendError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const verified = searchParams.get("verified")
    const err = searchParams.get("error")
    if (verified === "1") setSuccess("Email verified! You can log in now.")
    if (err === "invalid_token" || err === "missing_token") {
      setError("Verification link expired or invalid. Enter your email and use “Resend verification” below.")
      setNeedsVerification(true)
    }
  }, [searchParams])

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setNeedsVerification(false)
    setResendStatus("idle")
    setResendError(null)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (!result || result.error) {
        const check = await apiFetch(`/api/auth/check-verification?email=${encodeURIComponent(email)}`)
        const data = (await check.json()) as { verified?: boolean }
        if (data.verified === false) {
          setNeedsVerification(true)
          setError("Please verify your email before logging in. Check your inbox or resend the link.")
        } else {
          setError("Invalid email or password.")
        }
        return
      }

      const session = await getSession()
      const role = session?.user?.role || "parent"
      router.push(role === "admin" ? "/admin" : "/parent")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) return
    setResendStatus("sending")
    setResendError(null)
    try {
      const res = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setResendError(data.error ?? "Failed to resend")
        setResendStatus("error")
        return
      }
      setResendStatus("sent")
    } catch {
      setResendError("Could not resend. Try again.")
      setResendStatus("error")
    }
  }

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginCode: studentCode.toUpperCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Invalid student code")
      }

      // Store child info in session storage for student dashboard
      console.log("Login successful, saving to session storage:", data.child)
      sessionStorage.setItem("student_child", JSON.stringify(data.child))

      console.log("Attempting navigation to /student")
      router.push("/student")

      // Fallback if router.push fails (sometimes happens in dev with certain router states)
      setTimeout(() => {
        if (window.location.pathname !== "/student") {
          console.log("Router push didn't happen, forcing reload logic")
          window.location.href = "/student"
        }
      }, 500)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 w-6 h-6 text-pink-400 animate-bounce" />
        <Star className="absolute bottom-40 left-20 w-6 h-6 text-purple-400 animate-pulse" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="HomeSchoolar Logo"
              width={80}
              height={80}
              className="group-hover:scale-105 transition-transform animate-float"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              HomeSchoolar
            </span>
          </Link>
        </div>

        <Card className="border-2 border-purple-200 shadow-xl bg-white/80 backdrop-blur animate-pop-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Welcome Back!
            </CardTitle>
            <CardDescription>Choose how you want to log in</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="parent" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="parent" className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Parent
                </TabsTrigger>
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Student
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parent">
                <form onSubmit={handleParentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="parent@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-2 border-purple-200 focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-2 border-purple-200 focus:border-purple-400"
                    />
                  </div>

                  {success && (
                    <div className="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm">{success}</div>
                  )}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</div>
                  )}
                  {needsVerification && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-2 border-teal-300"
                        onClick={handleResendVerification}
                        disabled={resendStatus === "sending"}
                      >
                        {resendStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : resendStatus === "sent" ? "Sent! Check your inbox" : "Resend verification email"}
                      </Button>
                      {resendStatus === "error" && resendError && (
                        <p className="text-xs text-center text-red-600">{resendError}</p>
                      )}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl"
                  >
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="student">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentCode">Your Secret Code</Label>
                    <Input
                      id="studentCode"
                      type="text"
                      placeholder="ABC123"
                      required
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                      className="border-2 border-purple-200 focus:border-purple-400 text-center text-2xl tracking-widest font-bold uppercase"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground text-center">Ask your parent for your secret code!</p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-400 via-teal-500 to-cyan-500 hover:from-green-500 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⭐</span> Starting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Start Learning!
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-medium underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
          <Card className="w-full max-w-md border-2 border-purple-200 shadow-xl bg-white/80 backdrop-blur">
            <CardContent className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
