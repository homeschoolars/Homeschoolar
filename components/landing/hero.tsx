"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Play,
  Sparkles,
  Users,
  FileCheck,
  Star,
  Rocket,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const heroImages = [
  {
    src: "/images/hero-1.jpg",
    alt: "Boy learning online with laptop, waving at teacher",
  },
  {
    src: "/images/hero-2.jpg",
    alt: "Girl writing notes while e-learning on laptop at home",
  },
  {
    src: "/images/hero-3.jpg",
    alt: "Mother helping son with homeschool lessons on laptop",
  },
]

export function Hero() {
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % heroImages.length)
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + heroImages.length) % heroImages.length)

  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-b from-purple/5 via-pink/5 to-cyan/5">
      {/* Animated background blobs */}
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple/20 blur-3xl animate-float" />
      <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-pink/20 blur-3xl animate-float-delay-1" />
      <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan/20 animate-float-delay-2" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-purple/30 bg-white/80 backdrop-blur px-5 py-2 text-sm font-semibold text-purple shadow-lg animate-bounce-slow">
            <Sparkles className="h-5 w-5 text-yellow animate-pulse" />
            <span className="text-rainbow">AI-Powered Learning Platform</span>
            <Rocket className="h-5 w-5 text-orange animate-wiggle" />
          </div>

          <h1 className="font-heading text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl text-balance animate-slide-up">
            Raising <span className="text-rainbow animate-pulse inline-block">Thinkers</span>, Not Just Students
            <Star className="inline-block h-10 w-10 text-yellow fill-yellow ml-2 animate-wiggle" />
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/70 md:text-xl text-pretty animate-slide-up stagger-1">
            Personalized AI worksheets, instant feedback, and progress tracking designed for homeschool families. Give
            your children ages 4-13 the gift of <span className="font-bold text-pink">joyful</span>,{" "}
            <span className="font-bold text-purple">effective</span> learning!
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up stagger-2">
            <Button
              size="lg"
              asChild
              className="gap-2 bg-gradient-to-r from-purple via-pink to-orange hover:opacity-90 shadow-xl hover:shadow-purple/30 hover:scale-105 transition-all text-lg px-8 py-6"
            >
              <Link href="/signup">
                Start Your 14-Day Free Trial
                <ArrowRight className="h-5 w-5 animate-bounce-slow" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="gap-2 border-2 border-cyan bg-white/80 hover:bg-cyan/10 hover:border-cyan text-cyan font-semibold hover:scale-105 transition-all text-lg px-8 py-6"
            >
              <Link href="#how-it-works">
                <Play className="h-5 w-5 fill-cyan" />
                See How It Works
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm animate-slide-up stagger-3">
            <div className="flex items-center gap-2 bg-green/10 rounded-full px-4 py-2 border-2 border-green/30">
              <Users className="h-5 w-5 text-green" />
              <span className="font-bold text-green">2,500+</span>
              <span className="text-foreground/70">families</span>
            </div>
            <div className="flex items-center gap-2 bg-blue/10 rounded-full px-4 py-2 border-2 border-blue/30">
              <FileCheck className="h-5 w-5 text-blue" />
              <span className="font-bold text-blue">150,000+</span>
              <span className="text-foreground/70">worksheets</span>
            </div>
            <div className="flex items-center gap-2 bg-pink/10 rounded-full px-4 py-2 border-2 border-pink/30">
              <Heart className="h-5 w-5 text-pink fill-pink" />
              <span className="font-bold text-pink">AI-graded</span>
              <span className="text-foreground/70">in seconds</span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl animate-pop-in">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border-4 border-purple/30 bg-white shadow-2xl shadow-purple/20">
            {heroImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentImage ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={image.src || "/placeholder.svg"}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}

            {/* Navigation arrows */}
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all hover:scale-110 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 text-purple" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all hover:scale-110 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 text-purple" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`h-3 w-3 rounded-full transition-all ${
                    index === currentImage ? "bg-purple w-8" : "bg-white/70 hover:bg-white"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Floating notification cards */}
          <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border-2 border-green/30 bg-white p-4 shadow-xl md:block animate-float">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green to-cyan">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Math worksheet graded!</p>
                <p className="text-xs text-green font-semibold">Score: 95% - Great job! 🎉</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 hidden rounded-2xl border-2 border-purple/30 bg-white p-4 shadow-xl md:block animate-float-reverse">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple to-pink">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">New worksheet ready</p>
                <p className="text-xs text-purple font-semibold">Personalized for Emma ✨</p>
              </div>
            </div>
          </div>
          {/* Extra decorative stars */}
          <Star className="absolute -left-8 top-1/3 h-8 w-8 text-yellow fill-yellow animate-wiggle hidden lg:block" />
          <Star className="absolute -right-6 bottom-1/3 h-6 w-6 text-pink fill-pink animate-wiggle hidden lg:block" />
        </div>
      </div>
    </section>
  )
}
