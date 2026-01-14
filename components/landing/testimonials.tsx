import { Star, Heart, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Sarah M.",
    role: "Mom of 3",
    avatar: "/friendly-cartoon-mom-avatar-illustration.jpg",
    content:
      "HomeSchoolar has been a game-changer for our family. The AI worksheets are perfectly suited to each of my kids, and I love how it tracks their progress automatically.",
    rating: 5,
    color: "pink",
  },
  {
    name: "David K.",
    role: "Homeschool Dad",
    avatar: "/friendly-cartoon-dad-avatar-illustration.jpg",
    content:
      "The auto-grading feature saves me hours every week. My daughter gets instant feedback and actually enjoys doing her worksheets now!",
    rating: 5,
    color: "purple",
  },
  {
    name: "Jennifer L.",
    role: "Mom of 2",
    avatar: "/friendly-cartoon-mother-avatar-illustration.jpg",
    content:
      "I was skeptical about AI for education, but the personalized recommendations are spot-on. It knows exactly when my son is ready for the next challenge.",
    rating: 5,
    color: "cyan",
  },
]

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-purple/5 via-pink/5 to-orange/5 relative overflow-hidden">
      {/* Decorative hearts */}
      <Heart className="absolute left-10 top-20 h-8 w-8 text-pink fill-pink animate-float opacity-50" />
      <Star className="absolute right-16 bottom-24 h-6 w-6 text-yellow fill-yellow animate-wiggle opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Loved by <span className="text-rainbow">Homeschool Families</span>
            <Heart className="inline-block h-8 w-8 text-pink fill-pink ml-2 animate-pulse" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Join thousands of parents who have transformed their homeschool experience.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <div
              key={testimonial.name}
              className="flex flex-col rounded-3xl border-3 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl animate-slide-up"
              style={{
                animationDelay: `${i * 0.15}s`,
                borderColor: `var(--${testimonial.color})`,
              }}
            >
              {/* Quote icon */}
              <Quote className="h-8 w-8 mb-2 opacity-30" style={{ color: `var(--${testimonial.color})` }} />

              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-5 w-5 fill-yellow text-yellow animate-wiggle"
                    style={{ animationDelay: `${j * 0.1}s` }}
                  />
                ))}
              </div>
              <p className="flex-1 text-foreground leading-relaxed font-medium">"{testimonial.content}"</p>
              <div
                className="mt-6 flex items-center gap-3 border-t-2 pt-4"
                style={{ borderColor: `var(--${testimonial.color})30` }}
              >
                <img
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.name}
                  className="h-14 w-14 rounded-full object-cover border-3 shadow-lg"
                  style={{ borderColor: `var(--${testimonial.color})` }}
                />
                <div>
                  <p className="font-bold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
