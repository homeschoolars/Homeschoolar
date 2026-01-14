"use client"

import { Star, Heart, Sparkles, Circle, Triangle, Square } from "lucide-react"

// Colorful floating decorations for kid-friendly visual appeal
export function FloatingDecorations() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Stars */}
      <Star className="absolute left-[5%] top-[15%] h-6 w-6 text-yellow animate-float fill-yellow opacity-60" />
      <Star className="absolute right-[10%] top-[25%] h-8 w-8 text-pink animate-float-delay-1 fill-pink opacity-50" />
      <Star className="absolute left-[15%] bottom-[30%] h-5 w-5 text-cyan animate-float-delay-2 fill-cyan opacity-40" />

      {/* Hearts */}
      <Heart className="absolute right-[8%] top-[60%] h-7 w-7 text-pink animate-float-reverse fill-pink opacity-50" />
      <Heart className="absolute left-[3%] top-[45%] h-5 w-5 text-red animate-float fill-red opacity-40" />

      {/* Sparkles */}
      <Sparkles className="absolute right-[15%] bottom-[20%] h-6 w-6 text-purple animate-wiggle opacity-60" />
      <Sparkles className="absolute left-[20%] top-[70%] h-8 w-8 text-yellow animate-wiggle opacity-50" />

      {/* Shapes */}
      <Circle className="absolute left-[8%] bottom-[15%] h-10 w-10 text-green animate-bounce-slow fill-green/30 opacity-40" />
      <Triangle className="absolute right-[5%] top-[40%] h-8 w-8 text-orange animate-float fill-orange/30 opacity-40" />
      <Square className="absolute left-[12%] top-[5%] h-6 w-6 text-blue animate-float-reverse fill-blue/30 opacity-40" />

      {/* Additional decorative circles */}
      <div className="absolute right-[20%] top-[10%] h-16 w-16 rounded-full bg-gradient-to-br from-pink/20 to-purple/20 animate-float-delay-1 blur-sm" />
      <div className="absolute left-[25%] bottom-[25%] h-12 w-12 rounded-full bg-gradient-to-br from-cyan/20 to-blue/20 animate-float blur-sm" />
      <div className="absolute right-[30%] bottom-[40%] h-20 w-20 rounded-full bg-gradient-to-br from-yellow/15 to-orange/15 animate-float-delay-2 blur-md" />
    </div>
  )
}
