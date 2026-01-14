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

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <FloatingDecorations />
      <Header />
      <main className="flex-1">
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
