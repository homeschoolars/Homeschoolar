import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, Star, Sparkles } from "lucide-react"

const faqs = [
  {
    question: "What ages is HomeSchoolar designed for?",
    answer:
      "HomeSchoolar is designed for children ages 4-13, with curriculum and worksheets adapted to five age groups: 4-5, 6-7, 8-9, 10-11, and 12-13 years. The AI automatically adjusts difficulty and content style for each age group.",
    emoji: "👶",
    color: "pink",
  },
  {
    question: "How does the AI generate worksheets?",
    answer:
      "Our AI analyzes your child's age, learning level, and past performance to create personalized worksheets. It considers which topics they've mastered, where they need practice, and their learning preferences to generate engaging, appropriately challenging content.",
    emoji: "🤖",
    color: "purple",
  },
  {
    question: "Can I add multiple children to one account?",
    answer:
      "Yes! On our paid plans, you can add unlimited children to your account. Each child gets their own profile with individualized worksheets, progress tracking, and curriculum recommendations.",
    emoji: "👨‍👩‍👧‍👦",
    color: "cyan",
  },
  {
    question: "What subjects are covered?",
    answer:
      "We cover 10 comprehensive subjects including English (Early Literacy), Mathematics (Early Numeracy), Science, Social Studies, Self-Awareness, Etiquettes & Manners, Emotional Management, Health & Hygiene, Financial Education, and Islamic Studies. Each subject is broken down into age-appropriate topics.",
    emoji: "📚",
    color: "green",
  },
  {
    question: "How does auto-grading work?",
    answer:
      "When your child submits a worksheet, our AI instantly grades their answers and provides detailed feedback. For incorrect answers, it explains the concept and shows the correct solution, turning mistakes into learning opportunities.",
    emoji: "✅",
    color: "blue",
  },
  {
    question: "Can I download or print worksheets?",
    answer:
      "Yes, paid subscribers can export any worksheet as a PDF for offline use or printing. This is perfect for screen-free learning time or when you're on the go.",
    emoji: "🖨️",
    color: "orange",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We offer a 14-day free trial with full access to all features. No credit card is required to start. You can add up to 2 children during the trial period.",
    emoji: "🎁",
    color: "yellow",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time from your account settings. There are no cancellation fees, and you'll continue to have access until the end of your billing period.",
    emoji: "💳",
    color: "red",
  },
]

export function FAQ() {
  return (
    <section
      id="faq"
      className="py-20 md:py-28 bg-gradient-to-b from-blue/5 via-purple/5 to-pink/5 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <HelpCircle className="absolute left-10 top-20 h-8 w-8 text-purple animate-float opacity-40" />
      <Star className="absolute right-16 bottom-24 h-6 w-6 text-yellow fill-yellow animate-wiggle opacity-50" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Frequently Asked <span className="text-rainbow">Questions</span>
            <Sparkles className="inline-block h-8 w-8 text-yellow ml-2 animate-pulse" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">Everything you need to know about HomeSchoolar.</p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="rounded-2xl border-2 bg-white px-6 shadow-lg transition-all hover:shadow-xl data-[state=open]:shadow-xl animate-slide-up overflow-hidden"
                style={{
                  animationDelay: `${index * 0.05}s`,
                  borderColor: `var(--${faq.color})30`,
                }}
              >
                <AccordionTrigger className="text-left font-bold text-foreground hover:no-underline py-5 gap-3">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{faq.emoji}</span>
                    <span className="hover:text-purple transition-colors">{faq.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 leading-relaxed pb-5 text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
