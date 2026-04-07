"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export type ChildOption = { id: string; name: string; ageYears: number | null }

export function AssessmentSetup({
  childrenList,
  childId,
  onChildId,
  age,
  onAge,
  includeIslamic,
  onIncludeIslamic,
  onStart,
  disabled,
  startHint,
  assessedChildName,
}: {
  childrenList: ChildOption[]
  childId: string
  onChildId: (id: string) => void
  age: number
  onAge: (n: number) => void
  includeIslamic: boolean
  onIncludeIslamic: (v: boolean) => void
  onStart: () => void
  disabled?: boolean
  /** Extra context under the title (e.g. password gate, where the report appears). */
  startHint?: string
  assessedChildName?: string
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Learning assessment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Age-based discovery questions (not re-generated each time). After you finish, we use AI to build your
          personalised written report. Younger children use parent observation mode.
          {assessedChildName ? (
            <span className="block mt-2 font-medium text-violet-800">For {assessedChildName}</span>
          ) : null}
        </p>
        {startHint ? <p className="mt-3 text-xs text-slate-600 leading-relaxed border border-violet-100 bg-violet-50/60 rounded-xl px-3 py-2">{startHint}</p> : null}
      </div>

      {childrenList.length === 0 ? (
        <p className="text-sm text-amber-800">Add a child profile from your dashboard first.</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Child</Label>
            <Select value={childId} onValueChange={onChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {childrenList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assess-age">Age (years)</Label>
            <Input
              id="assess-age"
              type="number"
              min={4}
              max={13}
              value={age}
              onChange={(e) => onAge(Number.parseInt(e.target.value, 10) || 4)}
            />
            <p className="text-xs text-slate-500">
              Ages 4–5 use parent observation prompts. Ages 6–13 get multiple-choice and follow-ups matched to their age band
              (6–7, 8–9, 10–11, 12–13).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">Include Islamic studies</p>
              <p className="text-xs text-slate-500">Adds questions for Islamic studies in the report.</p>
            </div>
            <Switch checked={includeIslamic} onCheckedChange={onIncludeIslamic} />
          </div>

          <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={onStart} disabled={disabled || !childId}>
            Start assessment
          </Button>
        </>
      )}
    </div>
  )
}
