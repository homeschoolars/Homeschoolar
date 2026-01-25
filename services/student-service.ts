import { prisma } from "@/lib/prisma"

const DEFAULT_SUBJECTS = [
  { name: "Mathematics", description: "Core math skills", icon: "calculator", color: "#4F46E5", displayOrder: 1 },
  { name: "Science", description: "Hands-on science exploration", icon: "flask", color: "#16A34A", displayOrder: 2 },
  { name: "English", description: "Reading, writing, and language", icon: "book-open", color: "#EC4899", displayOrder: 3 },
  { name: "Social Studies", description: "People, places, and history", icon: "globe", color: "#0EA5E9", displayOrder: 4 },
  { name: "Art & Creativity", description: "Creative thinking and expression", icon: "smile", color: "#F97316", displayOrder: 5 },
  { name: "Life Skills", description: "Habits, values, and daily skills", icon: "heart", color: "#8B5CF6", displayOrder: 6 },
  { name: "Physical Education", description: "Movement, fitness, and wellness", icon: "activity", color: "#F59E0B", displayOrder: 7 },
  { name: "Financial Literacy", description: "Money basics and smart choices", icon: "piggy-bank", color: "#22C55E", displayOrder: 8 },
]

async function ensureDefaultSubjects() {
  const existing = await prisma.subject.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()))
  const missing = DEFAULT_SUBJECTS.filter((s) => !existingNames.has(s.name.trim().toLowerCase()))
  if (missing.length > 0) {
    await prisma.subject.createMany({ data: missing })
  }
}

export async function findChildByLoginCode(loginCode: string) {
  return prisma.child.findUnique({
    where: { loginCode },
  })
}

export async function getStudentDashboard(childId: string) {
  await ensureDefaultSubjects()
  const [subjects, assignments, progress, child] = await Promise.all([
    prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.worksheetAssignment.findMany({
      where: { childId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { worksheet: true },
    }),
    prisma.progress.findMany({ where: { childId } }),
    prisma.child.findUnique({ where: { id: childId } }),
  ])

  return {
    subjects,
    assignments,
    progress,
    child,
  }
}
