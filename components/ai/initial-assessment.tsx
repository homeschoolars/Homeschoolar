"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ClipboardCheck, Loader2, ChevronRight, Trophy, Target, Lightbulb } from "lucide-react"
import type { Subject, AgeGroup, Question, Answer } from "@/lib/types"
import { apiFetch } from "@/lib/api-client"

interface InitialAssessmentProps {
  childId: string
  childName: string
  ageGroup: AgeGroup
  subjects: Subject[]
  onComplete: () => void
}

type AssessmentQuestion = Question & { skill_tested: string }

interface AssessmentResult {
  score: number
  max_score: number
  recommended_level: string
  analysis: string
  strengths: string[]
  areas_to_work_on: string[]
  suggested_starting_topics: string[]
}

export function InitialAssessment({ childId, childName, ageGroup, subjects, onComplete }: InitialAssessmentProps) {
  const [step, setStep] = useState<"intro" | "assessment" | "results">("intro")
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<AssessmentResult | null>(null)
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([])

  const currentSubject = subjects[currentSubjectIndex]
  const currentQuestion = questions[currentQuestionIndex]
  const overallProgress =
    ((currentSubjectIndex + currentQuestionIndex / Math.max(questions.length, 1)) / subjects.length) * 100

  const startAssessment = async () => {
    setStep("assessment")
    await loadSubjectAssessment(currentSubject)
  }

  const loadSubjectAssessment = async (subject: Subject) => {
    setIsLoading(true)
    setQuestions([])
    setCurrentQuestionIndex(0)
    setAnswers([])
    setSelectedAnswer("")

    try {
      const response = await apiFetch("/api/ai/initial-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          subject_id: subject.id,
          subject_name: subject.name,
          age_group: ageGroup,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAssessmentId(data.assessment.id)
        setQuestions(data.assessment.questions)
      }
    } catch (error) {
      console.error("Error loading assessment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = () => {
    if (!selectedAnswer) return

    const newAnswers = [...answers, { question_id: currentQuestion.id, answer: selectedAnswer }]
    setAnswers(newAnswers)
    setSelectedAnswer("")

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      completeSubjectAssessment(newAnswers)
    }
  }

  const completeSubjectAssessment = async (finalAnswers: Answer[]) => {
    setIsLoading(true)

    try {
      const response = await apiFetch("/api/ai/complete-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessmentId,
          answers: finalAnswers,
          age_group: ageGroup,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data)
        setCompletedSubjects([...completedSubjects, currentSubject.id])

        // Move to next subject or finish
        if (currentSubjectIndex < subjects.length - 1) {
          setTimeout(() => {
            setCurrentSubjectIndex((prev) => prev + 1)
            setResults(null)
            loadSubjectAssessment(subjects[currentSubjectIndex + 1])
          }, 3000)
        } else {
          setStep("results")
        }
      }
    } catch (error) {
      console.error("Error completing assessment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-purple-200">
        <CardHeader className="text-center bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
            <ClipboardCheck className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome, {childName}!</CardTitle>
          <CardDescription className="text-base">
            Let&apos;s find out what you already know so we can create the perfect learning path for you!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What to Expect:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Quick Questions</p>
                  <p className="text-sm text-gray-500">Answer questions about different subjects</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">No Pressure</p>
                  <p className="text-sm text-gray-500">It&apos;s okay to not know everything!</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-600 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Personalized Path</p>
                  <p className="text-sm text-gray-500">We&apos;ll create lessons just for you</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              <strong>Subjects to cover:</strong> {subjects.map((s) => s.name.split("(")[0].trim()).join(", ")}
            </p>
          </div>

          <Button
            onClick={startAssessment}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg py-6"
          >
            Let&apos;s Start! <ChevronRight className="ml-2" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "results") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-green-200">
        <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
          <CardDescription className="text-base">
            Great job, {childName}! We&apos;ve created your personalized learning path.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">Subjects Assessed</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{completedSubjects.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Ready to Learn</span>
                </div>
                <p className="text-2xl font-bold text-green-700">100%</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Your learning journey is ready! Let&apos;s start exploring your subjects.
            </p>
            <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              Start Learning!
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Assessment in progress
  return (
    <Card className="max-w-2xl mx-auto border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Subject {currentSubjectIndex + 1} of {subjects.length}
          </span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: currentSubject.color || "#8B5CF6" }}
          >
            {currentSubject.name.split("(")[0].trim()}
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto text-purple-500 animate-spin mb-4" />
            <p className="text-gray-600">{results ? "Loading next subject..." : "Preparing questions..."}</p>
          </div>
        ) : results ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {currentSubject.name.split("(")[0].trim()} Complete!
            </h3>
            <p className="text-gray-600 mb-4">
              Level: <span className="font-semibold capitalize">{results.recommended_level}</span>
            </p>
            <p className="text-sm text-gray-500">Moving to next subject...</p>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-gray-500 mb-4">
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span>{currentQuestion.points} points</span>
            </div>

            <p className="text-lg font-medium text-gray-800">{currentQuestion.question}</p>

            {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedAnswer === option
                          ? "border-purple-400 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200"
                      }`}
                      onClick={() => setSelectedAnswer(option)}
                    >
                      <RadioGroupItem value={option} id={`q-${index}`} />
                      <Label htmlFor={`q-${index}`} className="cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {currentQuestion.type === "true_false" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="grid grid-cols-2 gap-4">
                  {["True", "False"].map((option) => (
                    <div
                      key={option}
                      className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedAnswer === option
                          ? "border-purple-400 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200"
                      }`}
                      onClick={() => setSelectedAnswer(option)}
                    >
                      <RadioGroupItem value={option} id={option} className="sr-only" />
                      <Label htmlFor={option} className="cursor-pointer font-medium text-lg">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            <Button
              onClick={handleAnswer}
              disabled={!selectedAnswer}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Complete Subject"}
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
