import { SubjectLessonClient } from "./subject-lesson-client"

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SubjectLessonClient subjectId={id} />
}
