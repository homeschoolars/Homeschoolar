import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail, Sparkles, Star, CheckCircle } from "lucide-react"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-100 via-teal-100 to-cyan-100">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 w-6 h-6 text-green-400 animate-bounce" />
        <CheckCircle className="absolute bottom-40 left-20 w-10 h-10 text-teal-400 animate-pulse" />
      </div>

      <Card className="w-full max-w-md border-2 border-green-200 shadow-xl bg-white/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center mb-4 animate-bounce">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
            Check Your Email!
          </CardTitle>
          <CardDescription className="text-base">
            We&apos;ve sent a confirmation link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-800 text-center">
              Click the link in your email to verify your account and start your learning adventure!
            </p>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              <Link href="/login">
                <Sparkles className="w-4 h-4 mr-2" />
                Go to Login
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-2 border-green-300 bg-transparent">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
