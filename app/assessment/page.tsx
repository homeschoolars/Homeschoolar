import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function AssessmentIndexPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  if (session.user.role !== "parent") {
    redirect("/student")
  }

  const children = await prisma.child.findMany({
    where: { parentId: session.user.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 1,
  })

  if (children.length === 0) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-600">Add a child from your dashboard to run the learning assessment.</p>
        <Link href="/parent" className="mt-4 inline-block font-medium text-violet-600 underline">
          Go to dashboard
        </Link>
      </div>
    )
  }

  redirect(`/assessment/${children[0].id}`)
}
