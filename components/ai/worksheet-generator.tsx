"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Sparkles, Loader2, Check, BookOpen } from "lucide-react"
import type { Subject, AgeGroup, Difficulty, Worksheet } from "@/lib/types"

interface WorksheetGeneratorProps {
  subjects: Subject[]
  childId?: string
  childAgeGroup?: AgeGroup
  childLevel?: string
  onGenerated?: (worksheet: Worksheet) => void
}

export function WorksheetGenerator({
  subjects,
  childId,
  childAgeGroup,
  childLevel,
  onGenerated,
}: WorksheetGeneratorProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(childAgeGroup || "6-7")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [topic, setTopic] = useState("")
  const [numQuestions, setNumQuestions] = useState([5])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!selectedSubject) return

    setIsGenerating(true)
    setError(null)
    setGenerated(false)

    try {
      const subject = subjects.find((s) => s.id === selectedSubject)

      const response = await fetch("/api/ai/generate-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubject,
          subject_name: subject?.name,
          age_group: ageGroup,
          difficulty,
          topic: topic || undefined,
          num_questions: numQuestions[0],
          child_level: childLevel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate worksheet")
      }

      const data = await response.json()
      setGenerated(true)
      onGenerated?.(data.worksheet)
    } catch (err) {
      setError("Failed to generate worksheet. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Worksheet Generator
        </CardTitle>
        <CardDescription>Create personalized worksheets powered by AI</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Subject Selection */}
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color || "#8B5CF6" }} />
                    {subject.name.split("(")[0].trim()}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age Group */}
        <div className="space-y-2">
          <Label>Age Group</Label>
          <Select value={ageGroup} onValueChange={(v) => setAgeGroup(v as AgeGroup)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4-5">4-5 years</SelectItem>
              <SelectItem value="6-7">6-7 years</SelectItem>
              <SelectItem value="8-9">8-9 years</SelectItem>
              <SelectItem value="10-11">10-11 years</SelectItem>
              <SelectItem value="12-13">12-13 years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy - Foundational</SelectItem>
              <SelectItem value="medium">Medium - Grade Level</SelectItem>
              <SelectItem value="hard">Hard - Challenging</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Topic (Optional) */}
        <div className="space-y-2">
          <Label>Specific Topic (Optional)</Label>
          <Input
            placeholder="e.g., Addition with carrying, Phonics..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {/* Number of Questions */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Number of Questions</Label>
            <span className="text-sm font-medium text-purple-600">{numQuestions[0]}</span>
          </div>
          <Slider value={numQuestions} onValueChange={setNumQuestions} min={3} max={10} step={1} className="w-full" />
        </div>

        {/* Error Message */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedSubject || isGenerating}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Worksheet...
            </>
          ) : generated ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Worksheet Generated!
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Worksheet
            </>
          )}
        </Button>

        {generated && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Worksheet created successfully!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              The worksheet is pending admin approval before it can be assigned.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
