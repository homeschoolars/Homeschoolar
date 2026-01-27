"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Newspaper, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

export function NewsManager() {
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleRegenerate = async (ageBand?: "4-7" | "8-13") => {
    try {
      setRegenerating(ageBand || "all")
      setSuccess(null)
      const response = await apiFetch("/api/admin/news/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ageBand ? { age_band: ageBand } : {}),
      })
      if (!response.ok) {
        throw new Error("Failed to regenerate news")
      }
      const data = await response.json()
      setSuccess(ageBand || "all")
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error("Failed to regenerate news:", error)
    } finally {
      setRegenerating(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Newspaper className="mr-2 h-5 w-5" />
          News Panel Management
        </CardTitle>
        <CardDescription>Manage child-friendly news content for students</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Auto-refresh:</strong> News is automatically regenerated every 6 hours via cron job.
              You can manually regenerate news for specific age bands below.
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Age Bands</TabsTrigger>
              <TabsTrigger value="4-7">Age 4-7</TabsTrigger>
              <TabsTrigger value="8-13">Age 8-13</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Regenerate All News</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will regenerate news for both age bands (4-7 and 8-13).
                </p>
                <Button
                  onClick={() => handleRegenerate()}
                  disabled={regenerating !== null}
                  variant="default"
                >
                  {regenerating === "all" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : success === "all" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Regenerated!
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate All
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="4-7" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Regenerate News for Age 4-7</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate new child-friendly news content for younger students (ages 4-7).
                </p>
                <Button
                  onClick={() => handleRegenerate("4-7")}
                  disabled={regenerating !== null}
                  variant="default"
                >
                  {regenerating === "4-7" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : success === "4-7" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Regenerated!
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate for 4-7
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="8-13" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Regenerate News for Age 8-13</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate new child-friendly news content for older students (ages 8-13).
                </p>
                <Button
                  onClick={() => handleRegenerate("8-13")}
                  disabled={regenerating !== null}
                  variant="default"
                >
                  {regenerating === "8-13" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : success === "8-13" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Regenerated!
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate for 8-13
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> News items expire after 6 hours. The cron job automatically refreshes
              content, but you can manually trigger regeneration at any time.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
