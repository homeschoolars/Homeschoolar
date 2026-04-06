import type { BankQuestion } from "@/lib/assessment/types"

type Sub = { k: string; l: string }

const CORE: Sub[] = [
  { k: "math", l: "Math" },
  { k: "english", l: "English" },
  { k: "science", l: "Science" },
  { k: "art", l: "Art" },
  { k: "music", l: "Music" },
  { k: "coding", l: "Coding" },
  { k: "ai", l: "AI & technology" },
  { k: "digital", l: "Digital literacy" },
  { k: "social", l: "Social studies" },
  { k: "communication", l: "Communication" },
  { k: "life", l: "Life skills" },
]

const ISLAMIC: Sub = { k: "islamic", l: "Islamic studies" }

function observe(s: Sub, q: string, options: string[], weights: number[]): BankQuestion {
  return {
    id: "",
    type: "observe",
    subject: s.k,
    subjectLabel: s.l,
    question: q,
    options,
    weights,
  }
}

function mcq(s: Sub, q: string, options: string[], correctIndex: number): BankQuestion {
  return {
    id: "",
    type: "mcq",
    subject: s.k,
    subjectLabel: s.l,
    question: q,
    options,
    correctIndex,
  }
}

function scale(s: Sub, q: string): BankQuestion {
  return {
    id: "",
    type: "scale",
    subject: s.k,
    subjectLabel: s.l,
    question: q,
    minLabel: "Not yet / rarely",
    maxLabel: "Very much / often",
  }
}

function open(s: Sub, q: string): BankQuestion {
  return {
    id: "",
    type: "open",
    subject: s.k,
    subjectLabel: s.l,
    question: q,
    minLength: 20,
  }
}

/** Parent-observed: weighted MCQ + scale per subject */
function youngQuestions(subs: Sub[]): BankQuestion[] {
  const out: BankQuestion[] = []
  for (const s of subs) {
    out.push(
      observe(
        s,
        `When you watch ${s.l} activities at home, how engaged does your child seem?`,
        ["Very engaged and focused", "Sometimes interested", "Needs prompting", "Rarely shows interest"],
        [4, 3, 2, 1],
      ),
    )
    out.push(
      scale(
        s,
        `How confident do you feel your child is with ${s.l} ideas right now (for their age)?`,
      ),
    )
  }
  return out
}

/** Child / older: MCQ + scale or open */
function olderQuestions(subs: Sub[], age: number): BankQuestion[] {
  const out: BankQuestion[] = []
  const useOpen = age >= 10

  const mcqBank: Partial<Record<string, [string, string[], number]>> = {
    math: ["Which number comes next: 2, 4, 6, ?", ["7", "8", "9", "10"], 1],
    english: ["Which is a complete sentence?", ["Running fast.", "The cat sleeps.", "Under the table.", "Happy."], 1],
    science: ["What do plants need to grow?", ["Only soil", "Water, light, and air", "Only water", "Darkness"], 1],
    art: ["Mixing blue and yellow paint usually makes…", ["Red", "Green", "Orange", "Purple"], 1],
    music: ["A steady beat in music helps us…", ["Lose track", "Keep time together", "Ignore rhythm", "Skip notes"], 1],
    coding: ["A loop in coding means…", ["Stop forever", "Repeat instructions", "Delete code", "Print once"], 1],
    ai: ["AI tools can help learners by…", ["Replacing thinking", "Suggesting ideas to build on", "Doing homework secretly", "Removing practice"], 1],
    digital: ["A strong password is usually…", ["Your name", "Short and simple", "Long, unique, and private", "Shared with friends"], 2],
    social: ["Maps help us understand…", ["Only weather", "Places and how people connect", "Only math", "Music"], 1],
    communication: ["Good listening includes…", ["Interrupting quickly", "Eye contact and patience", "Finishing others' sentences", "Looking away only"], 1],
    life: ["Before crossing a road safely, you should…", ["Run quickly", "Stop, look, and listen", "Close your eyes", "Follow anyone"], 1],
    islamic: ["Kindness in Islam often starts with…", ["Ignoring others", "Small acts of care", "Competing only", "Staying silent always"], 1],
  }

  for (const s of subs) {
    const pack = mcqBank[s.k]
    if (pack) {
      out.push(mcq(s, pack[0], pack[1], pack[2]))
    } else {
      out.push(mcq(s, `Quick check: which option best fits ${s.l}?`, ["First option", "Second option (best)", "Third option", "Fourth option"], 1))
    }

    if (useOpen) {
      out.push(
        open(
          s,
          `In a few sentences, describe something ${s.l}-related your child enjoyed or tried recently, and what they learned.`,
        ),
      )
    } else {
      out.push(scale(s, `How motivated is your child to explore ${s.l} this month?`))
    }
  }
  return out
}

export function buildQuestionList(age: number, includeIslamic: boolean): BankQuestion[] {
  const subs = [...CORE]
  if (includeIslamic) subs.push(ISLAMIC)

  const raw = age <= 5 ? youngQuestions(subs) : olderQuestions(subs, age)
  return raw.map((q, i) => ({ ...q, id: `q-${i}` }))
}
