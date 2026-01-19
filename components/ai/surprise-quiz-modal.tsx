"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Sparkles, Clock, Star, Trophy, Loader2, PartyPopper } from "lucide-react"
import type { SurpriseQuiz, QuizQuestion, Answer } from "@/lib/types"
import confetti from "canvas-confetti"

interface SurpriseQuizModalProps {
  quiz: SurpriseQuiz
  ageGroup: string
  onComplete: (score: number) => void
  onClose: () => void
}

export function SurpriseQuizModal({ quiz, ageGroup, onComplete, onClose }: SurpriseQuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<{
    score: number
    max_score: number
    graded_answers: { question_id: string; is_correct: boolean; feedback: string }[]
    overall_feedback: string
    encouragement: string
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes

  const questions = quiz.questions as QuizQuestion[]
  const question = questions[currentQuestion]
  const progressPercent = ((currentQuestion + 1) / questions.length) * 100

  // Use refs to store latest values and avoid stale closures
  const answersRef = useRef(answers)
  const selectedAnswerRef = useRef(selectedAnswer)
  const currentQuestionRef = useRef(currentQuestion)
  const questionsRef = useRef(questions)

  // Update refs whenever state changes
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer
  }, [selectedAnswer])

  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  // Define submitQuiz before useEffect so it's in scope and stable
  const submitQuiz = async (finalAnswers: Answer[]) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ai/grade-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          answers: finalAnswers,
          age_group: ageGroup,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data)

        // Trigger confetti for good scores
        if (data.score >= data.max_score * 0.7) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          })
        }

        onComplete(data.score)
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (results) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Use refs to get latest values when timer expires to avoid stale closures
          const latestAnswers = answersRef.current
          const latestSelectedAnswer = selectedAnswerRef.current
          const latestQuestion = questionsRef.current[currentQuestionRef.current]
          
          // Build final answers with current state values from refs
          const finalAnswers = latestSelectedAnswer
            ? [...latestAnswers, { question_id: latestQuestion.id, answer: latestSelectedAnswer }]
            : latestAnswers
          
          // Call submitQuiz with latest values
          submitQuiz(finalAnswers)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  const handleNext = () => {
    if (!selectedAnswer) return

    const newAnswers = [...answers, { question_id: question.id, answer: selectedAnswer }]
    setAnswers(newAnswers)
    setSelectedAnswer("")

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      submitQuiz(newAnswers)
    }
  }

  const handleSubmitQuiz = () => {
    const finalAnswers = selectedAnswer ? [...answers, { question_id: question.id, answer: selectedAnswer }] : answers
    submitQuiz(finalAnswers)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (results) {
    const scorePercent = (results.score / results.max_score) * 100

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <PartyPopper className="w-6 h-6 text-yellow-500" />
              Quiz Complete!
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-200 to-amber-200 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <div>
                  <div className="text-3xl font-bold text-amber-600">{results.score}</div>
                  <div className="text-sm text-gray-500">out of {results.max_score}</div>
                </div>
              </div>
            </div>

            <div className="text-2xl font-bold text-purple-600 mb-2">{results.encouragement}</div>

            <p className="text-gray-600 mb-6">{results.overall_feedback}</p>

            {/* Stars earned */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < Math.round(scorePercent / 20) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Awesome! Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
              Surprise Quiz!
            </span>
            <span
              className={`flex items-center gap-1 text-sm font-normal ${
                timeLeft < 30 ? "text-red-500" : "text-gray-500"
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-purple-600 font-medium">{question.points} points</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Question */}
          <Card className="border-2 border-purple-100">
            <CardContent className="p-6">
              <p className="text-lg font-medium text-gray-800 mb-6">{question.question}</p>

              {question.type === "multiple_choice" && question.options && (
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  <div className="space-y-3">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedAnswer === option
                            ? "border-purple-400 bg-purple-50"
                            : "border-gray-200 hover:border-purple-200"
                        }`}
                        onClick={() => setSelectedAnswer(option)}
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {question.type === "true_false" && (
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer || isSubmitting}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : currentQuestion < questions.length - 1 ? (
                "Next Question"
              ) : (
                "Finish Quiz"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
