import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * LAYER 1: MASTER KNOWLEDGE FRAMEWORK (Static Reference)
 * 
 * Admin-defined framework that serves as a reference blueprint.
 * Never changes per child - ensures academic completeness and age safety.
 */

export interface CoreCompetency {
  competency: string
  description: string
  ageBands: {
    "4-7": {
      foundation: string[]
      bridge: string[]
      advanced: string[]
    }
    "8-13": {
      foundation: string[]
      bridge: string[]
      advanced: string[]
    }
  }
}

export interface SkillProgression {
  level: "Foundation" | "Bridge" | "Advanced"
  skills: string[]
  learningOutcomes: string[]
  ageCapabilityTargets: {
    "4-7": string[]
    "8-13": string[]
  }
}

export interface SubjectFramework {
  subject: string
  coreCompetencies: CoreCompetency[]
  skillProgression: SkillProgression[]
  nonNegotiableOutcomes: string[]
  ageSafetyRules: string[]
}

export interface MasterKnowledgeFramework {
  subjects: SubjectFramework[]
  ageBands: {
    "4-7": {
      mandatorySubjects: string[]
      allowedElectives: string[]
      maxWeeklyLessons: number
      maxLessonDuration: number // minutes
    }
    "8-13": {
      mandatorySubjects: string[]
      allowedElectives: string[]
      maxWeeklyLessons: number
      maxLessonDuration: number // minutes
    }
  }
  religionRules: {
    muslim: {
      mandatorySubjects: string[]
      conditionalSubjects: string[]
    }
    non_muslim: {
      mandatorySubjects: string[]
      conditionalSubjects: string[]
    }
  }
}

/**
 * Get Master Knowledge Framework
 * 
 * This is a static reference that can be:
 * 1. Hardcoded (for now)
 * 2. Stored in database (future enhancement)
 * 3. Loaded from config file
 * 
 * For now, we'll generate it dynamically from database subjects
 * but structure it as a framework reference.
 */
export async function getMasterKnowledgeFramework(): Promise<MasterKnowledgeFramework> {
  const subjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
  })

  // Build framework from database subjects
  // In production, this could be admin-configured
  const subjectFrameworks: SubjectFramework[] = subjects.map((subject) => ({
    subject: subject.name,
    coreCompetencies: [
      {
        competency: "Core Understanding",
        description: `Fundamental concepts in ${subject.name}`,
        ageBands: {
          "4-7": {
            foundation: [`Basic ${subject.name} concepts`],
            bridge: [`Intermediate ${subject.name} concepts`],
            advanced: [`Advanced ${subject.name} concepts`],
          },
          "8-13": {
            foundation: [`Foundation ${subject.name} concepts`],
            bridge: [`Bridge ${subject.name} concepts`],
            advanced: [`Advanced ${subject.name} concepts`],
          },
        },
      },
    ],
    skillProgression: [
      {
        level: "Foundation",
        skills: [`Foundation skills in ${subject.name}`],
        learningOutcomes: [`Understand basic ${subject.name} concepts`],
        ageCapabilityTargets: {
          "4-7": [`Age-appropriate foundation in ${subject.name}`],
          "8-13": [`Foundation level ${subject.name} understanding`],
        },
      },
      {
        level: "Bridge",
        skills: [`Bridge skills in ${subject.name}`],
        learningOutcomes: [`Apply ${subject.name} concepts`],
        ageCapabilityTargets: {
          "4-7": [`Age-appropriate bridge level in ${subject.name}`],
          "8-13": [`Bridge level ${subject.name} application`],
        },
      },
      {
        level: "Advanced",
        skills: [`Advanced skills in ${subject.name}`],
        learningOutcomes: [`Master advanced ${subject.name} concepts`],
        ageCapabilityTargets: {
          "4-7": [`Age-appropriate advanced level in ${subject.name}`],
          "8-13": [`Advanced level ${subject.name} mastery`],
        },
      },
    ],
    nonNegotiableOutcomes: [`Essential ${subject.name} learning outcomes`],
    ageSafetyRules: [
      `Content must be age-appropriate for ${subject.name}`,
      `No cognitive overload in ${subject.name}`,
      `Respect attention span limits`,
    ],
  }))

  // Define age band rules
  const framework: MasterKnowledgeFramework = {
    subjects: subjectFrameworks,
    ageBands: {
      "4-7": {
        mandatorySubjects: subjects
          .filter((s) => {
            const name = s.name.toLowerCase()
            return !name.includes("islamic") && 
                   !name.includes("computational") &&
                   !name.includes("robotics") &&
                   !name.includes("oratory") &&
                   !name.includes("creative") &&
                   !name.includes("visual arts") &&
                   !name.includes("environmental") &&
                   !name.includes("physics") &&
                   !name.includes("chemistry")
          })
          .map((s) => s.name),
        allowedElectives: [],
        maxWeeklyLessons: 15,
        maxLessonDuration: 20, // 20 minutes for 4-7
      },
      "8-13": {
        mandatorySubjects: subjects
          .filter((s) => {
            const name = s.name.toLowerCase()
            return !name.includes("islamic") &&
                   !name.includes("computational") &&
                   !name.includes("robotics") &&
                   !name.includes("oratory") &&
                   !name.includes("creative") &&
                   !name.includes("visual arts") &&
                   !name.includes("environmental") &&
                   !name.includes("physics") &&
                   !name.includes("chemistry")
          })
          .map((s) => s.name),
        allowedElectives: subjects
          .filter((s) => {
            const name = s.name.toLowerCase()
            return name.includes("computational") ||
                   name.includes("robotics") ||
                   name.includes("oratory") ||
                   name.includes("creative") ||
                   name.includes("visual arts") ||
                   name.includes("environmental") ||
                   name.includes("physics") ||
                   name.includes("chemistry")
          })
          .map((s) => s.name),
        maxWeeklyLessons: 20,
        maxLessonDuration: 30, // 30 minutes for 8-13
      },
    },
    religionRules: {
      muslim: {
        mandatorySubjects: subjects
          .filter((s) => s.name.toLowerCase().includes("islamic"))
          .map((s) => s.name),
        conditionalSubjects: [],
      },
      non_muslim: {
        mandatorySubjects: [],
        conditionalSubjects: [],
      },
    },
  }

  return framework
}

/**
 * Get subject framework for a specific subject
 */
export async function getSubjectFramework(subjectName: string): Promise<SubjectFramework | null> {
  const framework = await getMasterKnowledgeFramework()
  return framework.subjects.find((s) => s.subject === subjectName) || null
}

/**
 * Get allowed subjects for age band and religion
 */
export async function getAllowedSubjects(
  ageBand: "4-7" | "8-13",
  religion: "muslim" | "non_muslim"
): Promise<{
  mandatory: string[]
  conditional: string[]
  electives: string[]
}> {
  const framework = await getMasterKnowledgeFramework()
  
  const mandatory = framework.ageBands[ageBand].mandatorySubjects
  const conditional = framework.religionRules[religion].mandatorySubjects
  const electives = ageBand === "8-13" ? framework.ageBands[ageBand].allowedElectives : []

  return { mandatory, conditional, electives }
}
