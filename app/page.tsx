import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { AgeSelector } from "@/components/landing/age-selector"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Testimonials } from "@/components/landing/testimonials"
import { Pricing } from "@/components/landing/pricing"
import { FAQ } from "@/components/landing/faq"
import { Footer } from "@/components/landing/footer"
import { FloatingDecorations } from "@/components/landing/floating-decorations"
import { AnimatedBackground } from "@/components/ui/animated-background"

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <AnimatedBackground className="opacity-80" />
      <FloatingDecorations />
      <Header />
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 pt-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-purple-900 sm:text-5xl lg:text-6xl">
            homeschoolars
          </h1>
        </div>
        <Hero />
        <AgeSelector />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
