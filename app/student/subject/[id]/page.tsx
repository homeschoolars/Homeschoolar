"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

export default function SubjectPage({ params }: { params: { id: string } }) {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 p-8">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-8 hover:bg-white/50"
            >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>

            <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-purple-800 mb-4">Subject {params.id}</h1>
                <p className="text-gray-600 mb-8">This is where the subject details and lessons will be listed.</p>
                <div className="text-6xl animate-bounce">📚</div>
            </div>
        </div>
    )
}
