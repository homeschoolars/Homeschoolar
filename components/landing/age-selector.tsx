"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Baby, BookOpen, Lightbulb, GraduationCap, Rocket, Star, Sparkles } from "lucide-react"

const ageGroups = [
  {
    id: "4-5",
    label: "Ages 4-5",
    title: "Little Explorers",
    icon: Baby,
    color: "pink",
    bgGradient: "from-pink to-orange",
    subjects: [
      "English (Early Literacy)",
      "Mathematics (Early Numeracy)",
      "Science (General Awareness)",
      "Social Studies (My World)",
      "Self-Awareness (Core Life Skill)",
      "Etiquettes & Manners",
      "Emotional Management",
      "Health & Hygiene",
      "Financial Education (Money Awareness)",
      "Islamic Studies (Foundation)",
    ],
    description:
      "Playful introduction to learning through songs, stories, and hands-on activities for our youngest learners.",
    emoji: "🌈",
  },
  {
    id: "6-7",
    label: "Ages 6-7",
    title: "Curious Minds",
    icon: BookOpen,
    color: "orange",
    bgGradient: "from-orange to-yellow",
    subjects: [
      "English (Early Literacy)",
      "Mathematics (Early Numeracy)",
      "Science (General Awareness)",
      "Social Studies (My World)",
      "Self-Awareness (Core Life Skill)",
      "Etiquettes & Manners",
      "Emotional Management",
      "Health & Hygiene",
      "Financial Education (Money Awareness)",
      "Islamic Studies (Foundation)",
    ],
    description:
      "Building foundational reading and number skills with engaging, interactive worksheets and activities.",
    emoji: "📚",
  },
  {
    id: "8-9",
    label: "Ages 8-9",
    title: "Growing Learners",
    icon: Lightbulb,
    color: "purple",
    bgGradient: "from-purple to-blue",
    subjects: [
      "English (Early Literacy)",
      "Mathematics (Early Numeracy)",
      "Science (General Awareness)",
      "Social Studies (My World)",
      "Self-Awareness (Core Life Skill)",
      "Etiquettes & Manners",
      "Emotional Management",
      "Health & Hygiene",
      "Financial Education (Money Awareness)",
      "Islamic Studies (Foundation)",
    ],
    description:
      "Developing critical thinking and problem-solving skills through more complex concepts and challenges.",
    emoji: "💡",
  },
  {
    id: "10-11",
    label: "Ages 10-11",
    title: "Knowledge Builders",
    icon: GraduationCap,
    color: "cyan",
    bgGradient: "from-cyan to-green",
    subjects: [
      "English (Early Literacy)",
      "Mathematics (Early Numeracy)",
      "Science (General Awareness)",
      "Social Studies (My World)",
      "Self-Awareness (Core Life Skill)",
      "Etiquettes & Manners",
      "Emotional Management",
      "Health & Hygiene",
      "Financial Education (Money Awareness)",
      "Islamic Studies (Foundation)",
    ],
    description: "Advanced curriculum preparing students for independent learning with deeper subject exploration.",
    emoji: "🎓",
  },
  {
    id: "12-13",
    label: "Ages 12-13",
    title: "Future Leaders",
    icon: Rocket,
    color: "green",
    bgGradient: "from-green to-teal",
    subjects: [
      "English (Early Literacy)",
      "Mathematics (Early Numeracy)",
      "Science (General Awareness)",
      "Social Studies (My World)",
      "Self-Awareness (Core Life Skill)",
      "Etiquettes & Manners",
      "Emotional Management",
      "Health & Hygiene",
      "Financial Education (Money Awareness)",
      "Islamic Studies (Foundation)",
    ],
    description: "Comprehensive curriculum that challenges young minds and prepares them for higher academic pursuits.",
    emoji: "🚀",
  },
]

export function AgeSelector() {
  const [selectedAge, setSelectedAge] = useState("8-9")
  const selected = ageGroups.find((g) => g.id === selectedAge)!

  return (
    <section
      id="curriculum"
      className="py-20 md:py-28 bg-gradient-to-b from-yellow/5 via-green/5 to-cyan/5 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <Sparkles className="absolute left-10 top-20 h-8 w-8 text-yellow animate-wiggle opacity-60" />
      <Star className="absolute right-16 top-32 h-6 w-6 text-pink fill-pink animate-float opacity-50" />
      <Rocket className="absolute left-20 bottom-20 h-10 w-10 text-purple animate-float-reverse opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            <span className="text-rainbow">Curriculum</span> Tailored to Every Age
            <Star className="inline-block h-8 w-8 text-yellow fill-yellow ml-2 animate-wiggle" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Our AI adapts content to match your child's developmental stage, ensuring the right challenge at the right
            time.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <div className="flex flex-wrap justify-center gap-3">
            {ageGroups.map((group) => {
              const Icon = group.icon
              const isSelected = selectedAge === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedAge(group.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-3 p-3 md:p-4 transition-all hover:scale-105 min-w-[100px] md:min-w-[140px]",
                    isSelected
                      ? `border-${group.color} bg-gradient-to-br ${group.bgGradient} shadow-xl`
                      : "border-border bg-white hover:border-purple/30 hover:shadow-lg",
                  )}
                  style={isSelected ? { borderColor: `var(--${group.color})` } : {}}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl transition-all",
                      isSelected ? "bg-white/30 text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="text-center">
                    <p className={cn("font-bold text-sm md:text-base", isSelected ? "text-white" : "text-foreground")}>
                      {group.label}
                    </p>
                    <p className={cn("text-xs md:text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>
                      {group.emoji} {group.title}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div
            className={cn("mt-8 rounded-3xl border-3 bg-white p-6 shadow-xl md:p-8 transition-all")}
            style={{ borderColor: `var(--${selected.color})` }}
          >
            <div className="flex flex-col gap-6 md:flex-row md:gap-10">
              <div className="md:w-1/3">
                <h3 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
                  {selected.title}
                  <span className="text-3xl">{selected.emoji}</span>
                </h3>
                <p className="mt-2 text-foreground/70 leading-relaxed">{selected.description}</p>
              </div>
              <div className="md:w-2/3">
                <p className="mb-3 text-sm font-bold text-foreground/60 uppercase tracking-wide">Core Subjects</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {selected.subjects.map((subject, i) => (
                    <li
                      key={subject}
                      className="flex items-center gap-3 text-foreground text-sm md:text-base font-medium animate-slide-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", `bg-${selected.color}`)}
                        style={{ backgroundColor: `var(--${selected.color})` }}
                      />
                      {subject}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
