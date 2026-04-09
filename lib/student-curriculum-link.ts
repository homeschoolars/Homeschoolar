import { prisma } from "@/lib/prisma"
import { toCurriculumAgeGroupName } from "@/lib/age-group"

/** Ensures `students.curriculum_age_group_id` matches the Prisma `age_group` enum name (e.g. AGE_8_9). */
export async function ensureStudentCurriculumAgeGroupLink(studentId: string): Promise<void> {
  const child = await prisma.child.findUnique({
    where: { id: studentId },
    select: { ageGroup: true, curriculumAgeGroupId: true },
  })
  if (!child) return
  const ag = await prisma.curriculumAgeGroup.findUnique({
    where: { name: toCurriculumAgeGroupName(child.ageGroup) },
    select: { id: true },
  })
  if (ag && child.curriculumAgeGroupId !== ag.id) {
    await prisma.child.update({
      where: { id: studentId },
      data: { curriculumAgeGroupId: ag.id },
    })
  }
}
