import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function WorksheetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 p-8">
            <Button
                variant="ghost"
                asChild
                className="mb-8 hover:bg-white/50"
            >
                <Link href="/student">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>

            <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-purple-800 mb-4">Worksheet {id}</h1>
                <p className="text-gray-600 mb-8">This is where the worksheet content will go.</p>
                <div className="text-6xl animate-bounce">📝</div>
            </div>
        </div>
    )
}
