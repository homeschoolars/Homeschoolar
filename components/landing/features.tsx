import { Sparkles, CheckCircle2, BarChart3, Users, BookOpen, Lightbulb, Star } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Worksheet Generation",
    description:
      "Instantly create personalized worksheets tailored to each child's level, learning style, and interests.",
    color: "purple",
    bgGradient: "from-purple to-pink",
    emoji: "✨",
  },
  {
    icon: CheckCircle2,
    title: "Auto-Grading & Feedback",
    description:
      "Get immediate results with detailed explanations so children understand their mistakes and learn from them.",
    color: "green",
    bgGradient: "from-green to-cyan",
    emoji: "🎯",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Visual dashboards show growth over time, highlighting strengths and areas that need more practice.",
    color: "blue",
    bgGradient: "from-blue to-purple",
    emoji: "📊",
  },
  {
    icon: Users,
    title: "Multi-Child Management",
    description:
      "Easily manage multiple children with individual profiles, progress reports, and customized learning paths.",
    color: "pink",
    bgGradient: "from-pink to-orange",
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Curriculum",
    description:
      "Cover all core subjects from math and reading to science and creative arts, aligned with educational standards.",
    color: "orange",
    bgGradient: "from-orange to-yellow",
    emoji: "📚",
  },
  {
    icon: Lightbulb,
    title: "Smart Recommendations",
    description:
      "Our AI suggests the next best topics based on performance, keeping children challenged but not overwhelmed.",
    color: "yellow",
    bgGradient: "from-yellow to-green",
    emoji: "💡",
  },
]

export function Features() {
  return (
    <section
      id="features"
      className="py-20 md:py-28 bg-gradient-to-b from-pink/5 via-purple/5 to-blue/5 relative overflow-hidden"
    >
      {/* Decorative stars */}
      <Star className="absolute right-10 top-20 h-8 w-8 text-yellow fill-yellow animate-float opacity-50" />
      <Star className="absolute left-16 bottom-32 h-6 w-6 text-pink fill-pink animate-wiggle opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Everything You Need for <span className="text-rainbow">Successful</span> Homeschooling
            <Sparkles className="inline-block h-8 w-8 text-yellow ml-2 animate-pulse" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Powerful tools designed to make teaching easier and learning more engaging.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-3xl border-3 border-transparent bg-white p-6 shadow-lg transition-all hover:scale-105 hover:shadow-2xl animate-slide-up"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  borderColor: `var(--${feature.color})20`,
                }}
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.bgGradient} shadow-lg group-hover:animate-wiggle transition-transform`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                  {feature.title}
                  <span className="text-2xl">{feature.emoji}</span>
                </h3>
                <p className="mt-2 text-foreground/70 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
