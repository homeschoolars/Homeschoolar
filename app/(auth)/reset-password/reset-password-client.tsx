"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"

interface ResetPasswordClientProps {
  token: string
}

export function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!token) {
      setError("Reset link is invalid or missing.")
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    try {
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Failed to reset password")
        return
      }
      setSuccess("Password updated successfully. You can now log in.")
      setPassword("")
      setConfirmPassword("")
    } catch {
      setError("Could not reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 w-6 h-6 text-pink-400 animate-bounce" />
        <Star className="absolute bottom-40 left-20 w-6 h-6 text-purple-400 animate-pulse" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <Image
              src="/homeschoolars-logo-v2.png"
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
              Reset Password
            </CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-purple-200 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-2 border-purple-200 focus:border-purple-400"
                />
              </div>

              {success && <div className="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm">{success}</div>}
              {error && <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</div>}

              <Button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium underline">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
