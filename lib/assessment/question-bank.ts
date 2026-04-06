import type { BankQuestion } from "@/lib/assessment/types"

type Sub = { k: string; l: string }

/** Matches app age groups from `deriveAgeGroup` for direct-assessment ages. */
export type AssessmentMcqBand = "6-7" | "8-9" | "10-11" | "12-13"

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

/** One MCQ per subject key: question, options, correctIndex */
type McqPack = [string, string[], number]

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

function open(s: Sub, q: string, minLength: number): BankQuestion {
  return {
    id: "",
    type: "open",
    subject: s.k,
    subjectLabel: s.l,
    question: q,
    minLength,
  }
}

export function assessmentMcqBand(age: number): AssessmentMcqBand {
  if (age <= 7) return "6-7"
  if (age <= 9) return "8-9"
  if (age <= 11) return "10-11"
  return "12-13"
}

/**
 * Age-calibrated quick checks: same subjects and structure per band, different difficulty and wording.
 */
const MCQ_BY_BAND: Record<AssessmentMcqBand, Record<string, McqPack>> = {
  "6-7": {
    math: ["What number comes right after 3?", ["2", "4", "5", "6"], 1],
    english: ["Which is made of letters you can read as a word?", ["c4t", "cat", "###", "b33p"], 1],
    science: ["Which one is alive?", ["Rock", "Plant", "Toy car", "Pencil"], 1],
    art: ["We often use crayons and markers to…", ["Eat lunch", "Draw and color", "Sleep", "Drive"], 1],
    music: ["A drum is often used to help us feel…", ["Only silence", "A steady beat", "Only cold", "Only numbers"], 1],
    coding: ["Following steps in order is like…", ["Random guessing", "A recipe you follow", "Only sleeping", "Ignoring instructions"], 1],
    ai: ["A computer tool that suggests words or ideas can be…", ["An AI helper", "A sock", "A sandwich", "Only the sky"], 0],
    digital: ["Personal details online should usually be…", ["Shared with everyone", "Kept private with trusted adults", "Posted on strangers’ pages", "Ignored forever"], 1],
    social: ["A simple map can show…", ["Only snacks", "Places like towns or countries", "Only jokes", "Only shoes"], 1],
    communication: ["Saying “please” and “thank you” is usually…", ["Polite and kind", "Rude", "Only for robots", "Only in games"], 0],
    life: ["Before crossing a road, you should…", ["Run without looking", "Stop, look, and listen", "Close your eyes", "Skip backward only"], 1],
    islamic: ["Sharing with a friend can show…", ["Kindness", "Anger", "Selfishness", "Sleeping"], 0],
  },
  "8-9": {
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
  },
  "10-11": {
    math: ["The fraction 1/2 means…", ["One part of two equal parts", "Two whole numbers added", "Only the number 1", "A shape with three sides"], 0],
    english: ["A topic sentence in a paragraph usually…", ["Ends the whole story", "States the main idea", "Has no purpose", "Is always a question"], 1],
    science: ["Photosynthesis mainly helps plants…", ["Make food using light", "Grow only in total darkness", "Create electricity directly", "Remove gravity"], 0],
    art: ["Perspective in drawing often helps show…", ["Only one flat color", "Depth and distance", "Only random dots", "Only text"], 1],
    music: ["A time signature like 4/4 tells musicians…", ["How loud to be only", "How beats are grouped in a measure", "Which instrument is banned", "Only the song title"], 1],
    coding: ["A variable in a program is best described as…", ["A fixed number that never changes", "A named place to store a value", "Only a picture", "An error message"], 1],
    ai: ["When using AI for schoolwork, a responsible habit is to…", ["Copy answers without reading", "Check facts and add your own thinking", "Share passwords with it", "Ignore teacher rules"], 1],
    digital: ["Phishing often tries to…", ["Teach cooking safely", "Trick you into giving private info", "Improve your spelling only", "Speed up your Wi‑Fi always"], 1],
    social: ["Primary sources in history are…", ["Only cartoons from today", "Evidence from the time period studied", "Only opinions with no proof", "Only maps of weather"], 1],
    communication: ["Active listening often includes…", ["Planning your reply while they talk", "Paraphrasing to check understanding", "Changing the subject instantly", "Multitasking on a phone"], 1],
    life: ["SMART goals are helpful because they…", ["Are always impossible", "Make plans clearer and trackable", "Remove all effort", "Avoid deadlines"], 1],
    islamic: ["Gratitude (shukr) in daily life can include…", ["Ignoring blessings", "Noticing and appreciating good responsibly", "Boasting to others only", "Avoiding kindness"], 1],
  },
  "12-13": {
    math: ["If x + 5 = 12, what is x?", ["17", "7", "12", "5"], 1],
    english: ["Which is a complex sentence?", ["The dog ran.", "Because it rained, we stayed inside.", "Birds fly.", "Stop!"], 1],
    science: ["Energy stored in food is mainly in the form of…", ["Only sound waves", "Chemical bonds (e.g., in sugars)", "Only magnetism", "Only color"], 1],
    art: ["Color theory often uses a wheel to relate…", ["Only prices", "Hues and how they combine", "Only frame sizes", "Only signatures"], 1],
    music: ["Harmony in music refers to…", ["Only volume", "How notes/chords combine vertically", "Only tempo markings", "Only lyrics"], 1],
    coding: ["Debugging typically means…", ["Deleting the whole program", "Finding and fixing errors", "Adding random code", "Printing only"], 1],
    ai: ["Bias in an AI model can lead to…", ["Fairer outcomes always", "Unfair or skewed results if unchecked", "No effect on answers", "Only faster typing"], 1],
    digital: ["Two-factor authentication adds security by…", ["Removing passwords entirely", "Requiring a second proof of identity", "Posting your location publicly", "Using one short PIN only"], 1],
    social: ["A citizen’s role in a democracy can include…", ["Only ignoring laws", "Informed participation and responsibility", "Avoiding all civic duties", "Only following orders blindly"], 1],
    communication: ["Constructive feedback is most effective when it…", ["Attacks the person", "Targets behavior and suggests next steps", "Uses only vague words", "Is shared publicly to embarrass"], 1],
    life: ["Executive function skills help with…", ["Only physical strength", "Planning, focus, and self-control", "Memorizing TV ads only", "Avoiding all goals"], 1],
    islamic: ["Balancing rights and responsibilities in community life reflects…", ["Only personal gain", "Adl (justice) and mutual care", "Ignoring others’ needs", "Avoiding all rules"], 1],
  },
}

function mcqForSubject(s: Sub, band: AssessmentMcqBand): BankQuestion {
  const pack = MCQ_BY_BAND[band][s.k] ?? MCQ_BY_BAND["8-9"][s.k]
  if (pack) return mcq(s, pack[0], pack[1], pack[2])
  return mcq(s, `Quick check: which option best fits ${s.l}?`, ["First option", "Second option (best)", "Third option", "Fourth option"], 1)
}

function followUpScale(s: Sub, band: AssessmentMcqBand): BankQuestion {
  const q =
    band === "6-7"
      ? `How curious is your child about ${s.l} activities lately?`
      : band === "8-9"
        ? `How motivated is your child to explore ${s.l} this month?`
        : band === "10-11"
          ? `How independently does your child stick with ${s.l} when it gets a bit challenging?`
          : `How confident does your child feel tackling age-appropriate ${s.l} tasks on their own?`
  return scale(s, q)
}

function followUpOpen(s: Sub, band: AssessmentMcqBand): BankQuestion {
  const minLength = band === "12-13" ? 40 : 30
  const q =
    band === "10-11"
      ? `Describe a recent ${s.l} task or project: what they tried, what worked, and one thing they’d improve next time.`
      : band === "12-13"
        ? `In a short paragraph, explain how ${s.l} connects to a real-world interest or goal your teen has, and what support would help.`
        : `In a few sentences, describe something ${s.l}-related your child enjoyed or tried recently, and what they learned.`
  return open(s, q, minLength)
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

/** Child / older: MCQ + scale or open, calibrated by age band */
function olderQuestions(subs: Sub[], age: number): BankQuestion[] {
  const out: BankQuestion[] = []
  const band = assessmentMcqBand(age)
  const useOpen = age >= 10

  for (const s of subs) {
    out.push(mcqForSubject(s, band))
    out.push(useOpen ? followUpOpen(s, band) : followUpScale(s, band))
  }
  return out
}

export function buildQuestionList(age: number, includeIslamic: boolean): BankQuestion[] {
  const subs = [...CORE]
  if (includeIslamic) subs.push(ISLAMIC)

  const raw = age <= 5 ? youngQuestions(subs) : olderQuestions(subs, age)
  return raw.map((q, i) => ({ ...q, id: `q-${i}` }))
}
