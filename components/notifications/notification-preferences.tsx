"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Mail, Bell, Loader2 } from "lucide-react"

interface Preferences {
  email_quiz_results: boolean
  email_progress_updates: boolean
  email_ai_recommendations: boolean
  email_subscription_alerts: boolean
  email_weekly_summary: boolean
  inapp_quiz_alerts: boolean
  inapp_worksheet_completed: boolean
  inapp_recommendations: boolean
  inapp_achievements: boolean
}

const defaultPreferences: Preferences = {
  email_quiz_results: true,
  email_progress_updates: true,
  email_ai_recommendations: true,
  email_subscription_alerts: true,
  email_weekly_summary: true,
  inapp_quiz_alerts: true,
  inapp_worksheet_completed: true,
  inapp_recommendations: true,
  inapp_achievements: true,
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).single()

    if (data) {
      setPreferences(data)
    }
    setIsLoading(false)
  }

  const handleToggle = async (key: keyof Preferences) => {
    const newValue = !preferences[key]
    setPreferences((prev) => ({ ...prev, [key]: newValue }))

    setIsSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      [key]: newValue,
      updated_at: new Date().toISOString(),
    })
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Email Notifications
          </CardTitle>
          <CardDescription>Choose which updates you want to receive via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_quiz_results">Quiz Results</Label>
            <Switch
              id="email_quiz_results"
              checked={preferences.email_quiz_results}
              onCheckedChange={() => handleToggle("email_quiz_results")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="email_progress_updates">Progress Updates</Label>
            <Switch
              id="email_progress_updates"
              checked={preferences.email_progress_updates}
              onCheckedChange={() => handleToggle("email_progress_updates")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="email_ai_recommendations">AI Recommendations</Label>
            <Switch
              id="email_ai_recommendations"
              checked={preferences.email_ai_recommendations}
              onCheckedChange={() => handleToggle("email_ai_recommendations")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="email_subscription_alerts">Subscription Alerts</Label>
            <Switch
              id="email_subscription_alerts"
              checked={preferences.email_subscription_alerts}
              onCheckedChange={() => handleToggle("email_subscription_alerts")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="email_weekly_summary">Weekly Summary</Label>
            <Switch
              id="email_weekly_summary"
              checked={preferences.email_weekly_summary}
              onCheckedChange={() => handleToggle("email_weekly_summary")}
            />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" /> In-App Notifications
          </CardTitle>
          <CardDescription>Choose which alerts appear in the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="inapp_quiz_alerts">Quiz Alerts</Label>
            <Switch
              id="inapp_quiz_alerts"
              checked={preferences.inapp_quiz_alerts}
              onCheckedChange={() => handleToggle("inapp_quiz_alerts")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="inapp_worksheet_completed">Worksheet Completed</Label>
            <Switch
              id="inapp_worksheet_completed"
              checked={preferences.inapp_worksheet_completed}
              onCheckedChange={() => handleToggle("inapp_worksheet_completed")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="inapp_recommendations">Recommendations</Label>
            <Switch
              id="inapp_recommendations"
              checked={preferences.inapp_recommendations}
              onCheckedChange={() => handleToggle("inapp_recommendations")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="inapp_achievements">Achievements</Label>
            <Switch
              id="inapp_achievements"
              checked={preferences.inapp_achievements}
              onCheckedChange={() => handleToggle("inapp_achievements")}
            />
          </div>
        </CardContent>
      </Card>

      {isSaving && <p className="text-sm text-gray-500 text-center">Saving...</p>}
    </div>
  )
}
