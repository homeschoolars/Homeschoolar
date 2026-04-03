"use client"

import { useMemo, useState } from "react"
import {
  bands,
  catColors,
  catLabels,
  curriculumData,
  type CurriculumCategory,
  type CurriculumFilter,
} from "@/lib/curriculumData"

export default function CurriculumExplorer() {
  const [activeAge, setActiveAge] = useState<number>(4)
  const [activeCat, setActiveCat] = useState<CurriculumFilter>("all")

  const filteredSubjects = useMemo(
    () => Object.entries(curriculumData).filter(([, subj]) => activeCat === "all" || subj.cat === activeCat),
    [activeCat]
  )

  const categories: Array<{ key: CurriculumFilter; label: string }> = [
    { key: "all", label: "All subjects" },
    { key: "core", label: "Core" },
    { key: "future", label: "Future Skills" },
    { key: "creative", label: "Creative" },
    { key: "life", label: "Life & Growth" },
  ]

  return (
    <div className="py-4">
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeCat === cat.key
          const dynamicBg =
            cat.key === "all"
              ? "#7F77DD"
              : cat.key === "core"
                ? catColors.core
                : cat.key === "future"
                  ? catColors.future
                  : cat.key === "creative"
                    ? catColors.creative
                    : catColors.life
          return (
            <button
              key={cat.key}
              className="cursor-pointer rounded-full border border-[#ccc] bg-white px-3.5 py-1.5 text-[13px] text-[#666] transition-all"
              style={isActive ? { color: "#fff", borderColor: "transparent", backgroundColor: dynamicBg } : {}}
              onClick={() => setActiveCat(cat.key)}
              type="button"
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-[#666]">Age:</span>
        {Array.from({ length: 10 }, (_, i) => i + 4).map((age) => {
          const isActive = activeAge === age
          return (
            <button
              key={age}
              className="h-[34px] w-[34px] cursor-pointer rounded-full border border-[#ccc] bg-white text-[13px] text-[#666] transition-all"
              style={isActive ? { backgroundColor: "#7F77DD", color: "#fff", borderColor: "transparent" } : {}}
              onClick={() => setActiveAge(age)}
              type="button"
            >
              {age}
            </button>
          )
        })}
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#999]">No subjects found.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filteredSubjects.map(([key, subj]) => {
            const topics = subj.content[activeAge] || []
            return (
              <div key={key} className="rounded-xl border border-[#e0e0e0] bg-white px-5 py-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subj.color }} />
                  <span className="text-[15px] font-medium text-[#111]">{subj.name}</span>
                  <span
                    className="ml-auto rounded-[10px] px-2 py-0.5 text-[11px]"
                    style={{ backgroundColor: `${subj.color}22`, color: subj.color }}
                  >
                    {catLabels[subj.cat as CurriculumCategory]}
                  </span>
                </div>
                <div className="mb-2.5 text-[11px] text-[#999]">
                  Age {activeAge} - {bands[activeAge]}
                </div>
                <ul className="list-none">
                  {topics.map((topic) => (
                    <li key={topic} className="border-b border-[#eee] py-[3px] text-[13px] leading-[1.5] text-[#555] last:border-b-0">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
