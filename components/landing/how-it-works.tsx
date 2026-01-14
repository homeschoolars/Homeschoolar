import { UserPlus, Wand2, PenTool, Trophy, Star, Sparkles } from "lucide-react"

const steps = [
  {
    step: 1,
    icon: UserPlus,
    title: "Create Your Family Account",
    description:
      "Sign up in minutes and add profiles for each of your children with their ages and learning preferences.",
    color: "purple",
    bgGradient: "from-purple to-pink",
    emoji: "👋",
  },
  {
    step: 2,
    icon: Wand2,
    title: "AI Creates Personalized Worksheets",
    description: "Our AI generates custom worksheets based on each child's grade level, interests, and learning pace.",
    color: "pink",
    bgGradient: "from-pink to-orange",
    emoji: "🪄",
  },
  {
    step: 3,
    icon: PenTool,
    title: "Children Complete at Their Own Pace",
    description: "Kids work through interactive worksheets with hints available when they need a little help.",
    color: "cyan",
    bgGradient: "from-cyan to-blue",
    emoji: "✏️",
  },
  {
    step: 4,
    icon: Trophy,
    title: "Track Progress & Celebrate Wins",
    description: "View detailed progress reports, identify growth areas, and celebrate achievements together.",
    color: "yellow",
    bgGradient: "from-yellow to-orange",
    emoji: "🏆",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 bg-gradient-to-b from-cyan/5 via-green/5 to-yellow/5 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <Star className="absolute left-10 top-24 h-6 w-6 text-purple fill-purple animate-wiggle opacity-50" />
      <Sparkles className="absolute right-20 bottom-20 h-8 w-8 text-pink animate-float opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            How <span className="text-rainbow">HomeSchoolar</span> Works
            <Star className="inline-block h-8 w-8 text-yellow fill-yellow ml-2 animate-bounce-slow" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Get started in minutes and transform your homeschool experience.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="relative text-center animate-slide-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Rainbow connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className="absolute left-1/2 top-12 hidden h-1 w-full -translate-y-1/2 lg:block rounded-full"
                      style={{
                        background: "linear-gradient(90deg, var(--purple), var(--pink), var(--cyan), var(--yellow))",
                      }}
                    />
                  )}
                  <div
                    className={`relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${item.bgGradient} shadow-xl hover:scale-110 transition-transform hover:animate-wiggle`}
                  >
                    <Icon className="h-10 w-10 text-white" />
                    {/* Step number badge */}
                    <span
                      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-lg border-2"
                      style={{ borderColor: `var(--${item.color})`, color: `var(--${item.color})` }}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground flex items-center justify-center gap-2">
                    {item.title}
                    <span className="text-2xl">{item.emoji}</span>
                  </h3>
                  <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
