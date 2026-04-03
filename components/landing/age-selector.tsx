"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Baby, BookOpen, Lightbulb, GraduationCap, Rocket, Star, Sparkles } from "lucide-react"

type TopicCategory = "Core" | "Future Skills" | "Life Skills"

const TOPIC_CATEGORIES: TopicCategory[] = ["Core", "Future Skills", "Life Skills"]

function getTopicCategory(index: number): TopicCategory {
  return TOPIC_CATEGORIES[index % TOPIC_CATEGORIES.length]
}

function getCategoryClasses(category: TopicCategory) {
  if (category === "Core") return "bg-violet-100 text-violet-700"
  if (category === "Future Skills") return "bg-cyan-100 text-cyan-700"
  return "bg-emerald-100 text-emerald-700"
}

const ageGroups = [
  {
    id: "4-5",
    label: "Little Explorers",
    title: "Little Explorers 🌱",
    ageRange: "Ages 4-5",
    icon: Baby,
    color: "pink",
    bgGradient: "from-pink to-orange",
    subjects: [
      "Story Worlds & Puppet Theatre",
      "Number Treasure Hunts",
      "Nature Detectives (Leaves, Bugs, Clouds)",
      "Feelings Lab (Name and Express Emotions)",
      "Kindness Missions & Sharing Games",
      "Sound Safari (Phonics through Play)",
      "Little Makers: Clay, Blocks, and Craft",
      "Healthy Heroes (Food and Hygiene Routines)",
    ],
    description:
      "Playful introduction to learning through songs, stories, and hands-on activities for our youngest learners.",
    emoji: "🌱",
    sampleLesson: "My Feelings Color Wheel: identify emotions and express one calming strategy.",
  },
  {
    id: "5-6",
    label: "Mini Adventurers",
    title: "Mini Adventurers 🐾",
    ageRange: "Ages 5-6",
    icon: BookOpen,
    color: "orange",
    bgGradient: "from-orange to-yellow",
    subjects: [
      "Phonics Theater & Read-Aloud Club",
      "Shape Architects (Build and Measure)",
      "Mini Chef Math (Counting while Cooking)",
      "Weather Watch Station",
      "Friendship Skills Studio",
      "Money Market Roleplay (Buy and Sell)",
      "Coding with Patterns and Arrows",
      "Manners in Action Challenges",
    ],
    description: "Expanding basic skills with visual activities, phonics, simple arithmetic, and curiosity-driven tasks.",
    emoji: "🐾",
    sampleLesson: "Tiny Market Day: use pretend coins to buy 3 items and explain choices.",
  },
  {
    id: "6-7",
    label: "Curious Minds",
    title: "Curious Minds 🔍",
    ageRange: "Ages 6-7",
    icon: BookOpen,
    color: "orange",
    bgGradient: "from-orange to-yellow",
    subjects: [
      "Sentence Builders & Comic Strips",
      "Pattern Puzzles and Early Algebra",
      "Plant and Animal Life Cycles",
      "Digital Safety Adventures",
      "Habit Tracker for Healthy Living",
      "Curiosity Journaling",
      "Map My Neighborhood",
      "Empathy and Teamwork Games",
    ],
    description:
      "Building foundational reading and number skills with engaging, interactive worksheets and activities.",
    emoji: "🔍",
    sampleLesson: "Neighborhood Mapping: draw home-to-school route and explain key landmarks.",
  },
  {
    id: "7-8",
    label: "Young Investigators",
    title: "Young Investigators 🧩",
    ageRange: "Ages 7-8",
    icon: Lightbulb,
    color: "purple",
    bgGradient: "from-purple to-blue",
    subjects: [
      "Main Idea Detectives",
      "Math Escape Rooms",
      "Forces and Motion Lab",
      "Intro to AI in Daily Life",
      "Conflict Resolution Roleplay",
      "Culture and Civilization Time Travel",
      "Green Planet Projects",
      "Public Speaking Starters",
    ],
    description:
      "Concept building through observation, structured lessons, and early problem-solving with real-world examples.",
    emoji: "🧩",
    sampleLesson: "AI Helper Hunt: list 3 smart tools used at home and one safety rule for each.",
  },
  {
    id: "8-9",
    label: "Growing Learners",
    title: "Growing Learners 💡",
    ageRange: "Ages 8-9",
    icon: Lightbulb,
    color: "purple",
    bgGradient: "from-purple to-blue",
    subjects: [
      "Critical Reading and Inference Club",
      "Fractions in Real Life (Recipes, Sports, Shopping)",
      "Ecosystem Explorers",
      "Coding Quest: Build Simple Games",
      "Goal Setting and Motivation Studio",
      "Future Skills: Media Literacy",
      "Ethics in Everyday Decisions",
      "Young Entrepreneur Challenges",
    ],
    description:
      "Developing critical thinking and problem-solving skills through more complex concepts and challenges.",
    emoji: "💡",
    sampleLesson: "Eco Mission Plan: design a one-week family waste reduction challenge.",
  },
  {
    id: "9-10",
    label: "Knowledge Explorers",
    title: "Knowledge Explorers 🚀",
    ageRange: "Ages 9-10",
    icon: Rocket,
    color: "cyan",
    bgGradient: "from-cyan to-green",
    subjects: [
      "Argument Writing and Debate Basics",
      "Geometry in Architecture and Design",
      "Chemistry Kitchen Experiments",
      "Research and Source Fact-Checking",
      "Budgeting, Saving, and Smart Spending",
      "Digital Citizenship and Online Identity",
      "Global Issues Roundtable",
      "Mini Start-up Simulation",
    ],
    description:
      "Applying concepts in deeper ways with reasoning tasks, multi-step problems, and independent mini projects.",
    emoji: "🚀",
    sampleLesson: "Fact-Check Sprint: verify 2 online claims using trusted sources and evidence notes.",
  },
  {
    id: "10-11",
    label: "Knowledge Builders",
    title: "Knowledge Builders 🏗️",
    ageRange: "Ages 10-11",
    icon: GraduationCap,
    color: "cyan",
    bgGradient: "from-cyan to-green",
    subjects: [
      "Literary Analysis and Theme Mapping",
      "Algebra and Graph Thinking",
      "Physics by Design Challenges",
      "AI Ethics and Responsible Tech Use",
      "Leadership and Team Dynamics",
      "Presentation and Persuasion Studio",
      "Historical Case Investigations",
      "Well-being and Peak Performance",
    ],
    description: "Advanced curriculum preparing students for independent learning with deeper subject exploration.",
    emoji: "🏗️",
    sampleLesson: "Debate Lab: build a claim, evidence, and rebuttal on responsible AI use in schools.",
  },
  {
    id: "11-12",
    label: "Skill Sharpeners",
    title: "Skill Sharpeners ⚡",
    ageRange: "Ages 11-12",
    icon: GraduationCap,
    color: "green",
    bgGradient: "from-green to-teal",
    subjects: [
      "Advanced Essay and Rhetoric Lab",
      "Statistics for Real-World Decisions",
      "Human Biology and Health Science",
      "Robotics and Automation Basics",
      "Global Citizenship and Empathy Projects",
      "Policy, Society, and Civic Thinking",
      "Creative Problem Solving Sprints",
      "Career Curiosity Explorations",
    ],
    description:
      "Refining analytical skills, communication, and confidence through debate, research, and real-world practice.",
    emoji: "⚡",
    sampleLesson: "Robotics Logic Board: create a flowchart for an automated school attendance system.",
  },
  {
    id: "12-13",
    label: "Future Leaders",
    title: "Future Leaders 🌟",
    ageRange: "Ages 12-13",
    icon: Rocket,
    color: "green",
    bgGradient: "from-green to-teal",
    subjects: [
      "Thesis Writing and Critical Discourse",
      "Pre-Calculus Modeling",
      "Biotechnology and Earth Systems",
      "Machine Learning Foundations",
      "Entrepreneurship and Innovation Lab",
      "Research Methods and Academic Integrity",
      "Negotiation, Debate, and Diplomacy",
      "Future Pathways: O/A Level Readiness",
    ],
    description: "Comprehensive curriculum that challenges young minds and prepares them for higher academic pursuits.",
    emoji: "🌟",
    sampleLesson: "Innovation Pitch: propose a social-impact startup with budget, audience, and success metric.",
  },
]

export function AgeSelector() {
  const [selectedAge, setSelectedAge] = useState("8-9")
  const [showSample, setShowSample] = useState(false)
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
                      {group.emoji} {group.ageRange}
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
                <button
                  className="mt-4 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                  onClick={() => setShowSample((prev) => !prev)}
                >
                  {showSample ? "Hide Sample Lesson" : "View Sample Lesson"}
                </button>
                {showSample ? (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                    {selected.sampleLesson}
                  </div>
                ) : null}
              </div>
              <div className="md:w-2/3">
                <p className="mb-3 text-sm font-bold text-foreground/60 uppercase tracking-wide">Featured Topics</p>
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
                      <span className="flex-1">{subject}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", getCategoryClasses(getTopicCategory(i)))}>
                        {getTopicCategory(i)}
                      </span>
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
