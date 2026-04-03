const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const prisma = new PrismaClient();

const STORY_PROMPT_TEMPLATE_4_5 = `Act as an expert early childhood teacher.
Create a short, engaging story for a 4-5 year old child about: [Lesson Title].
Use simple English, fun characters, and a moral lesson.
Keep it under 120 words.`;

const WORKSHEET_PROMPT_TEMPLATE_4_5 = `Act as a preschool educator.
Generate a printable worksheet for age 4-5 on topic: [Lesson Title].
Include:
- Tracing OR coloring activity
- Matching OR circling activity
Keep it simple and fun.`;

const QUIZ_PROMPT_TEMPLATE_4_5 = `Act as a teacher.
Create 10 simple quiz questions for age 4-5 on topic: [Lesson Title].
Use:
- MCQs
- Image-based logic (if possible)
Keep language very simple.`;

const STORY_PROMPT_TEMPLATE_6_7 = `Act as an expert primary school teacher.
Create a short, engaging story for a 6-7 year old child about: {{lessonTitle}}.
Use simple English but slightly more advanced than beginner level.
Include:
- Clear beginning, middle, end
- A small lesson or moral
Keep it under 150 words.`;

const WORKSHEET_PROMPT_TEMPLATE_6_7 = `Act as a primary school educator.
Generate a worksheet for age 6-7 on topic: {{lessonTitle}}.

Include:
- 1 tracing or writing activity
- 1 matching or fill-in-the-blank
- 1 thinking-based question

Keep it printable and engaging.`;

const QUIZ_PROMPT_TEMPLATE_6_7 = `Act as a teacher.
Create 5 quiz questions for age 6-7 on topic: {{lessonTitle}}.

Include:
- 3 MCQs
- 1 fill in the blank
- 1 logical or scenario-based question

Use clear and simple language.`;

const STORY_PROMPT_TEMPLATE_8_9 = `Act as an expert primary school teacher.
Create an engaging story for a 8-9 year old child about: {{lessonTitle}}.

Requirements:
- Clear beginning, middle, end
- Include a problem and solution
- Add a meaningful lesson or moral
- Encourage thinking and curiosity

Keep it between 150-200 words.`;

const WORKSHEET_PROMPT_TEMPLATE_8_9 = `Act as an educator.
Generate a worksheet for age 8-9 on topic: {{lessonTitle}}.

Include:
- 1 short writing or explanation task
- 1 matching or fill-in-the-blank activity
- 1 problem-solving or critical thinking question
- Optional mini-project

Keep it printable and engaging.`;

const QUIZ_PROMPT_TEMPLATE_8_9 = `Act as a teacher.
Create 5-7 quiz questions for age 8-9 on topic: {{lessonTitle}}.

Include:
- 3 MCQs
- 2 fill in the blanks
- 1 scenario-based or reasoning question

Ensure questions test understanding, not just memorization.`;

const AI_AWARENESS_PROMPT_8_9 = `Explain {{lessonTitle}} to a child in simple terms using real-life examples (like mobile apps, YouTube, voice assistants).
Include interactive outputs:
- Human vs AI comparison
- Real-life use cases`;

const STORY_PROMPT_TEMPLATE_10_11 = `Act as an expert educator.
Create an engaging and meaningful story for a 10-11 year old student about: {{lessonTitle}}.

Requirements:
- Clear beginning, middle, and end
- Include a real-world problem and solution
- Add a strong moral or lesson
- Encourage curiosity and reflection

Keep it between 200-250 words.`;

const WORKSHEET_PROMPT_TEMPLATE_10_11 = `Act as an experienced teacher.
Generate a worksheet for age 10-11 on topic: {{lessonTitle}}.

Include:
- 1 short writing or explanation task
- 1 fill-in-the-blank or matching activity
- 2 problem-solving or application-based questions
- 1 mini project or real-life task

Ensure worksheet promotes thinking, not just memorization.`;

const QUIZ_PROMPT_TEMPLATE_10_11 = `Act as a teacher.
Create 6-8 quiz questions for age 10-11 on topic: {{lessonTitle}}.

Include:
- 3 MCQs
- 2 fill in the blanks
- 2 scenario-based or reasoning questions

Ensure questions test understanding, logic, and application.`;

const PROJECT_PROMPT_TEMPLATE_10_11 = `Create a mini project for topic: {{lessonTitle}} suitable for age 10-11.
Include:
- Objective
- Materials needed
- Step-by-step instructions
- Expected outcome`;

const REFLECTION_PROMPT_TEMPLATE_10_11 = `Generate 2 reflection questions for topic: {{lessonTitle}} to help students think deeply.`;

const STORY_PROMPT_TEMPLATE_12_13 = `Act as an expert educator.
Create a meaningful and engaging story for a 12-13 year old student about: {{lessonTitle}}.

Requirements:
- Strong storyline (beginning, middle, end)
- Include a real-world challenge
- Show decision-making and consequences
- Add moral lesson
- Encourage critical thinking

Length: 250-300 words.`;

const WORKSHEET_PROMPT_TEMPLATE_12_13 = `Act as an experienced teacher.

Generate a worksheet for age 12-13 on topic: {{lessonTitle}}.

Include:
- 2 conceptual questions
- 2 problem-solving questions
- 1 real-world application task
- 1 mini project

Ensure it promotes reasoning and understanding.`;

const QUIZ_PROMPT_TEMPLATE_12_13 = `Create 8 questions for age 12-13:
- 3 MCQs
- 2 fill in the blanks
- 3 reasoning/scenario-based questions

Topic: {{lessonTitle}}`;

const PROJECT_PROMPT_TEMPLATE_12_13 = `Create a real-world project for topic: {{lessonTitle}}.

Include:
- Objective
- Materials
- Step-by-step process
- Expected learning outcome
- Real-life connection`;

const RESEARCH_PROMPT_TEMPLATE_12_13 = `Generate a small research task for topic: {{lessonTitle}}.

Include:
- Research question
- Steps to تحقیق (research)
- مصادر (sources) suggestion (books, internet, observation)
- Final presentation format`;

const DEBATE_PROMPT_TEMPLATE_12_13 = `Create a debate topic for: {{lessonTitle}}.

Include:
- Debate statement
- Arguments FOR
- Arguments AGAINST
- 2 critical thinking questions`;

const REFLECTION_PROMPT_TEMPLATE_12_13 = `Generate 3 reflection questions to help student think deeply about: {{lessonTitle}}.`;

const CURRICULUM_PROMPTS = {
  "4-5": {
    story: STORY_PROMPT_TEMPLATE_4_5,
    worksheet: WORKSHEET_PROMPT_TEMPLATE_4_5,
    quiz: QUIZ_PROMPT_TEMPLATE_4_5,
    project: `Create a simple mini project for topic: [Lesson Title] for age 4-5 with objective, materials, and steps.`,
    debate: `Create a simple discussion topic for age 4-5 on: [Lesson Title].`,
    research: `Create an observation task for age 4-5 on: [Lesson Title].`,
    reflection: `Generate 2 simple reflection questions for topic: [Lesson Title] for age 4-5.`,
  },
  "6-7": {
    story: STORY_PROMPT_TEMPLATE_6_7,
    worksheet: WORKSHEET_PROMPT_TEMPLATE_6_7,
    quiz: QUIZ_PROMPT_TEMPLATE_6_7,
    project: `Create a mini project for topic: {{lessonTitle}} suitable for age 6-7 with objective, materials, steps, and expected outcome.`,
    debate: `Create a basic debate/discussion topic for age 6-7 on: {{lessonTitle}}.`,
    research: `Create a guided mini research task for age 6-7 on: {{lessonTitle}}.`,
    reflection: `Generate 2 reflection questions for topic: {{lessonTitle}} for age 6-7.`,
  },
  "8-9": {
    story: STORY_PROMPT_TEMPLATE_8_9,
    worksheet: WORKSHEET_PROMPT_TEMPLATE_8_9,
    quiz: QUIZ_PROMPT_TEMPLATE_8_9,
    project: `Create a mini project for topic: {{lessonTitle}} suitable for age 8-9 with objective, materials, steps, and expected outcome.`,
    debate: `Create a debate topic for age 8-9 on: {{lessonTitle}} with arguments for and against.`,
    research: `Create a small research task for age 8-9 on: {{lessonTitle}} with steps and sources.`,
    reflection: `Generate 2 reflection questions for topic: {{lessonTitle}} for age 8-9.`,
  },
  "10-11": {
    story: STORY_PROMPT_TEMPLATE_10_11,
    worksheet: WORKSHEET_PROMPT_TEMPLATE_10_11,
    quiz: QUIZ_PROMPT_TEMPLATE_10_11,
    project: PROJECT_PROMPT_TEMPLATE_10_11,
    debate: `Create a debate topic for: {{lessonTitle}}. Include statement, for/against points, and 2 critical questions.`,
    research: `Generate a small research task for: {{lessonTitle}} with question, steps, suggested sources, and presentation format.`,
    reflection: REFLECTION_PROMPT_TEMPLATE_10_11,
  },
  "12-13": {
    story: STORY_PROMPT_TEMPLATE_12_13,
    worksheet: WORKSHEET_PROMPT_TEMPLATE_12_13,
    quiz: QUIZ_PROMPT_TEMPLATE_12_13,
    project: PROJECT_PROMPT_TEMPLATE_12_13,
    debate: DEBATE_PROMPT_TEMPLATE_12_13,
    research: RESEARCH_PROMPT_TEMPLATE_12_13,
    reflection: REFLECTION_PROMPT_TEMPLATE_12_13,
  },
};

const AGE_STAGE_MAP = {
  "4-5": "Foundation",
  "5-6": "Basic Understanding",
  "6-7": "Core Skills",
  "7-8": "Concept Building",
  "8-9": "Application",
  "9-10": "Analytical Thinking",
  "10-11": "Problem Solving",
  "11-12": "Pre-O Level Foundation",
  "12-13": "O Level Readiness",
};

const REQUIRED_SUBJECTS = [
  { name: "English", slug: "english" },
  { name: "Mathematics", slug: "mathematics" },
  { name: "Science", slug: "science" },
  { name: "Geography", slug: "geography" },
  { name: "History", slug: "history" },
  { name: "Computer & Technology", slug: "computer-and-technology" },
  { name: "Self Development", slug: "self-development" },
  { name: "Emotional Intelligence", slug: "emotional-intelligence" },
  { name: "Health", slug: "health" },
  { name: "Financial Literacy", slug: "financial-literacy" },
  { name: "Islamic Studies", slug: "islamic-studies" },
];

function getAgeStart(ageGroup) {
  const first = String(ageGroup || "").split("-")[0];
  const value = Number.parseInt(first, 10);
  return Number.isFinite(value) ? value : 4;
}

function buildGeneratedSubject(ageGroup, stageName, subject, displayOrder) {
  return {
    name: subject.name,
    slug: subject.slug,
    displayOrder,
    units: [
      {
        title: `${subject.name} Essentials`,
        slug: `${subject.slug}-essentials`,
        displayOrder: 1,
        lessons: [
          {
            title: `Core Concepts in ${subject.name}`,
            slug: `core-concepts-in-${subject.slug}`,
            difficultyIndicator: stageName.toLowerCase().replace(/\s+/g, "-"),
            displayOrder: 1,
            content: {
              storyText: `This ${ageGroup} lesson introduces key ${subject.name} ideas with age-appropriate examples and guided thinking tasks.`,
              activityInstructions: `Complete one guided activity and explain one concept from ${subject.name} in your own words.`,
              quizConcept: `Check understanding of foundational ${subject.name} concepts for ${ageGroup}.`,
              worksheetExample: `Short practice sheet with concept questions and one reasoning task.`,
              parentTip: `Ask your child to explain today's ${subject.name} idea using a real-life example.`,
            },
          },
        ],
      },
    ],
  };
}

async function seedStructuredCurriculumFile(fileName) {
  const curriculumPath = path.join(__dirname, "curriculum", fileName);
  const raw = fs.readFileSync(curriculumPath, "utf-8");
  const data = JSON.parse(raw);
  data.subjects = data.subjects || [];
  const prompts = CURRICULUM_PROMPTS[data.ageGroup] || CURRICULUM_PROMPTS["4-5"];
  const stageName = data.stageName || AGE_STAGE_MAP[data.ageGroup] || "Foundation";
  const ageStart = getAgeStart(data.ageGroup);

  const existingBySlug = new Set(data.subjects.map((s) => String(s.slug)));
  for (const required of REQUIRED_SUBJECTS) {
    if (!existingBySlug.has(required.slug)) {
      data.subjects.push(
        buildGeneratedSubject(data.ageGroup, stageName, required, data.subjects.length + 1)
      );
      existingBySlug.add(required.slug);
    }
  }

  const ageGroup = await prisma.curriculumAgeGroup.upsert({
    where: { name: data.ageGroup },
    update: { stageName },
    create: { name: data.ageGroup, stageName },
  });

  for (const [subjectIndex, subjectData] of data.subjects.entries()) {
    const baseSubject = await prisma.subject.findFirst({
      where: {
        OR: [
          { name: { equals: subjectData.name, mode: "insensitive" } },
          {
            AND: [
              { name: { contains: "Math", mode: "insensitive" } },
              { name: { contains: "ematics", mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true },
    });

    const curriculumSubject = await prisma.curriculumSubject.upsert({
      where: {
        ageGroupId_slug: {
          ageGroupId: ageGroup.id,
          slug: subjectData.slug,
        },
      },
      update: {
        name: subjectData.name,
        displayOrder: subjectData.displayOrder ?? subjectIndex + 1,
        baseSubjectId: baseSubject?.id ?? null,
      },
      create: {
        name: subjectData.name,
        slug: subjectData.slug,
        ageGroupId: ageGroup.id,
        displayOrder: subjectData.displayOrder ?? subjectIndex + 1,
        baseSubjectId: baseSubject?.id ?? null,
      },
    });

    for (const [unitIndex, unitData] of subjectData.units.entries()) {
      const curriculumUnit = await prisma.curriculumUnit.upsert({
        where: {
          subjectId_slug: {
            subjectId: curriculumSubject.id,
            slug: unitData.slug,
          },
        },
        update: {
          title: unitData.title,
          displayOrder: unitData.displayOrder ?? unitIndex + 1,
        },
        create: {
          title: unitData.title,
          slug: unitData.slug,
          subjectId: curriculumSubject.id,
          displayOrder: unitData.displayOrder ?? unitIndex + 1,
        },
      });

      for (const [lessonIndex, lessonData] of unitData.lessons.entries()) {
        const lesson = await prisma.curriculumLesson.upsert({
          where: {
            unitId_slug: {
              unitId: curriculumUnit.id,
              slug: lessonData.slug,
            },
          },
          update: {
            title: lessonData.title,
            difficultyLevel: lessonData.difficultyIndicator || stageName,
            displayOrder: lessonData.displayOrder ?? lessonIndex + 1,
          },
          create: {
            title: lessonData.title,
            slug: lessonData.slug,
            unitId: curriculumUnit.id,
            difficultyLevel: lessonData.difficultyIndicator || stageName,
            displayOrder: lessonData.displayOrder ?? lessonIndex + 1,
          },
        });

        await prisma.curriculumContent.upsert({
          where: { lessonId: lesson.id },
          update: {
            storyText: lessonData.content.storyText,
            activityInstructions: lessonData.content.activityInstructions,
            quizConcept: lessonData.content.quizConcept,
            worksheetExample: lessonData.content.worksheetExample,
            parentTip: lessonData.content.parentTip,
          },
          create: {
            lessonId: lesson.id,
            storyText: lessonData.content.storyText,
            activityInstructions: lessonData.content.activityInstructions,
            quizConcept: lessonData.content.quizConcept,
            worksheetExample: lessonData.content.worksheetExample,
            parentTip: lessonData.content.parentTip,
          },
        });

        const isComputerSubject = ["computer", "technology", "ai", "artificial intelligence"].some((keyword) =>
          String(subjectData.name).toLowerCase().includes(keyword)
        );
        const storyPrompt = isComputerSubject
          ? `${prompts.story}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.story;
        const worksheetPrompt = isComputerSubject
          ? `${prompts.worksheet}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.worksheet;
        const quizPrompt = isComputerSubject
          ? `${prompts.quiz}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.quiz;
        const projectPrompt = isComputerSubject
          ? `${prompts.project}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.project;
        const debatePrompt = isComputerSubject
          ? `${prompts.debate}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.debate;
        const researchPrompt = isComputerSubject
          ? `${prompts.research}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.research;
        const reflectionPrompt = isComputerSubject
          ? `${prompts.reflection}\n\n${AI_AWARENESS_PROMPT_8_9}`
          : prompts.reflection;

        await prisma.curriculumAIPrompt.upsert({
          where: { lessonId_type: { lessonId: lesson.id, type: "story" } },
          update: { promptTemplate: storyPrompt },
          create: {
            lessonId: lesson.id,
            type: "story",
            promptTemplate: storyPrompt,
          },
        });

        await prisma.curriculumAIPrompt.upsert({
          where: { lessonId_type: { lessonId: lesson.id, type: "worksheet" } },
          update: { promptTemplate: worksheetPrompt },
          create: {
            lessonId: lesson.id,
            type: "worksheet",
            promptTemplate: worksheetPrompt,
          },
        });

        await prisma.curriculumAIPrompt.upsert({
          where: { lessonId_type: { lessonId: lesson.id, type: "quiz" } },
          update: { promptTemplate: quizPrompt },
          create: {
            lessonId: lesson.id,
            type: "quiz",
            promptTemplate: quizPrompt,
          },
        });

        if (ageStart >= 8) {
          await prisma.curriculumAIPrompt.upsert({
            where: { lessonId_type: { lessonId: lesson.id, type: "project" } },
            update: { promptTemplate: projectPrompt },
            create: {
              lessonId: lesson.id,
              type: "project",
              promptTemplate: projectPrompt,
            },
          });
        }

        if (ageStart >= 11) {
          await prisma.curriculumAIPrompt.upsert({
            where: { lessonId_type: { lessonId: lesson.id, type: "debate" } },
            update: { promptTemplate: debatePrompt },
            create: {
              lessonId: lesson.id,
              type: "debate",
              promptTemplate: debatePrompt,
            },
          });
        }

        if (ageStart >= 10) {
          await prisma.curriculumAIPrompt.upsert({
            where: { lessonId_type: { lessonId: lesson.id, type: "research" } },
            update: { promptTemplate: researchPrompt },
            create: {
              lessonId: lesson.id,
              type: "research",
              promptTemplate: researchPrompt,
            },
          });
        }

        await prisma.curriculumAIPrompt.upsert({
          where: { lessonId_type: { lessonId: lesson.id, type: "reflection" } },
          update: { promptTemplate: reflectionPrompt },
          create: {
            lessonId: lesson.id,
            type: "reflection",
            promptTemplate: reflectionPrompt,
          },
        });
      }
    }
  }
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const parentPasswordHash = await bcrypt.hash("Parent123!", 10);
  const verifiedAt = new Date();

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@homeschooler.local" },
    update: { name: "Admin User", role: "admin", adminRole: "super_admin", emailVerified: verifiedAt },
    create: {
      email: "admin@homeschooler.local",
      name: "Admin User",
      role: "admin",
      adminRole: "super_admin",
      passwordHash: adminPasswordHash,
      emailVerified: verifiedAt,
    },
  });

  const parentUser = await prisma.user.upsert({
    where: { email: "parent@homeschooler.local" },
    update: { name: "Parent User", role: "parent", emailVerified: verifiedAt },
    create: {
      email: "parent@homeschooler.local",
      name: "Parent User",
      role: "parent",
      passwordHash: parentPasswordHash,
      emailVerified: verifiedAt,
    },
  });

  const parentUserTwo = await prisma.user.upsert({
    where: { email: "parent2@homeschooler.local" },
    update: { name: "Second Parent", role: "parent", emailVerified: verifiedAt },
    create: {
      email: "parent2@homeschooler.local",
      name: "Second Parent",
      role: "parent",
      passwordHash: parentPasswordHash,
      emailVerified: verifiedAt,
    },
  });

  await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      fullName: "Parent User",
      relationship: "guardian",
      email: parentUser.email,
      phone: "+10000000000",
      country: "Pakistan",
      timezone: "Asia/Karachi",
    },
  });

  await prisma.parent.upsert({
    where: { userId: parentUserTwo.id },
    update: {},
    create: {
      userId: parentUserTwo.id,
      fullName: "Second Parent",
      relationship: "mother",
      email: parentUserTwo.email,
      phone: "+10000000001",
      country: "Pakistan",
      timezone: "Asia/Karachi",
    },
  });

  const today = new Date();
  const yearsAgo = (years) => new Date(today.getFullYear() - years, today.getMonth(), today.getDate());

  const existingSubject = await prisma.subject.findFirst({
    where: { name: "Mathematics" },
  });
  const subject =
    existingSubject ??
    (await prisma.subject.create({
      data: {
        name: "Mathematics",
        description: "Core math skills",
        color: "#4F46E5",
        displayOrder: 1,
      },
    }));

  const existingScience = await prisma.subject.findFirst({
    where: { name: "Science" },
  });
  const scienceSubject =
    existingScience ??
    (await prisma.subject.create({
      data: {
        name: "Science",
        description: "Hands-on science exploration",
        color: "#16A34A",
        displayOrder: 2,
      },
    }));

  const extraSubjects = [
    { name: "English", description: "Reading, writing, and language", color: "#EC4899", displayOrder: 3 },
    { name: "Geography", description: "People, places, environment, and maps", color: "#0EA5E9", displayOrder: 4 },
    { name: "History", description: "Events, timelines, and social change", color: "#1D4ED8", displayOrder: 5 },
    { name: "Computer & Technology", description: "Digital literacy and AI awareness", color: "#0F766E", displayOrder: 6 },
    { name: "Self Development", description: "Self-awareness, habits, and growth mindset", color: "#8B5CF6", displayOrder: 7 },
    { name: "Emotional Intelligence", description: "Emotion awareness and regulation", color: "#F97316", displayOrder: 8 },
    { name: "Health", description: "Well-being, hygiene, and healthy routines", color: "#F59E0B", displayOrder: 9 },
    { name: "Financial Literacy", description: "Money basics and smart choices", color: "#22C55E", displayOrder: 10 },
    { name: "Islamic Studies", description: "Ethics, values, and character", color: "#059669", displayOrder: 11 },
    { name: "Social Studies", description: "Community, civics, and society", color: "#2563EB", displayOrder: 12 },
    { name: "Art & Creativity", description: "Creative thinking and expression", color: "#D97706", displayOrder: 13 },
    { name: "Life Skills", description: "Habits, values, and daily skills", color: "#7C3AED", displayOrder: 14 },
    { name: "Physical Education", description: "Movement, fitness, and wellness", color: "#EA580C", displayOrder: 15 },
  ];
  for (const s of extraSubjects) {
    const exists = await prisma.subject.findFirst({ where: { name: s.name } });
    if (!exists) {
      await prisma.subject.create({ data: s });
    }
  }

  const child = await prisma.child.upsert({
    where: { loginCode: "TEST1234" },
    update: { name: "Ava Student", parentId: parentUser.id },
    create: {
      name: "Ava Student",
      ageGroup: "AGE_8_9",
      loginCode: "TEST1234",
      parentId: parentUser.id,
      interests: ["Math", "Science"],
    },
  });

  const childTwo = await prisma.child.upsert({
    where: { loginCode: "TEST5678" },
    update: { name: "Liam Student", parentId: parentUserTwo.id },
    create: {
      name: "Liam Student",
      ageGroup: "AGE_6_7",
      loginCode: "TEST5678",
      parentId: parentUserTwo.id,
      interests: ["Science", "Art"],
    },
  });

  const childThree = await prisma.child.upsert({
    where: { loginCode: "TEST9012" },
    update: { name: "Noah Student", parentId: parentUserTwo.id },
    create: {
      name: "Noah Student",
      ageGroup: "AGE_10_11",
      loginCode: "TEST9012",
      parentId: parentUserTwo.id,
      interests: ["Math", "Robotics"],
    },
  });

  await prisma.childProfile.upsert({
    where: { childId: child.id },
    update: {},
    create: {
      childId: child.id,
      dateOfBirth: yearsAgo(9),
      ageYears: 9,
      religion: "muslim",
      educationLevel: "Grade 3",
      strengths: "Enjoys math puzzles",
      challenges: "Needs encouragement with writing",
    },
  });

  await prisma.learningPreference.upsert({
    where: { childId: child.id },
    update: {},
    create: {
      childId: child.id,
      learningStyles: ["visual", "kinesthetic"],
      attentionSpan: "medium",
      screenTolerance: "medium",
      needsEncouragement: true,
      learnsBetterWith: ["games", "step_by_step"],
    },
  });

  await prisma.childInterest.createMany({
    data: ["Math", "Science"].map((label) => ({
      childId: child.id,
      label,
      source: "preset",
    })),
    skipDuplicates: true,
  });

  await prisma.childProfile.upsert({
    where: { childId: childTwo.id },
    update: {},
    create: {
      childId: childTwo.id,
      dateOfBirth: yearsAgo(6),
      ageYears: 6,
      religion: "non_muslim",
      educationLevel: "Kindergarten",
      strengths: "Curious about nature",
      challenges: "Short attention span",
    },
  });

  await prisma.learningPreference.upsert({
    where: { childId: childTwo.id },
    update: {},
    create: {
      childId: childTwo.id,
      learningStyles: ["auditory", "visual"],
      attentionSpan: "short",
      screenTolerance: "low",
      needsEncouragement: false,
      learnsBetterWith: ["stories"],
    },
  });

  await prisma.childInterest.createMany({
    data: ["Science", "Art"].map((label) => ({
      childId: childTwo.id,
      label,
      source: "preset",
    })),
    skipDuplicates: true,
  });

  await prisma.childProfile.upsert({
    where: { childId: childThree.id },
    update: {},
    create: {
      childId: childThree.id,
      dateOfBirth: yearsAgo(11),
      ageYears: 11,
      religion: "muslim",
      educationLevel: "Grade 5",
      strengths: "Logical reasoning",
      challenges: "Prefers hands-on tasks",
    },
  });

  await prisma.learningPreference.upsert({
    where: { childId: childThree.id },
    update: {},
    create: {
      childId: childThree.id,
      learningStyles: ["reading_writing", "visual"],
      attentionSpan: "long",
      screenTolerance: "high",
      needsEncouragement: false,
      learnsBetterWith: ["challenges"],
    },
  });

  await prisma.childInterest.createMany({
    data: ["Math", "Robotics"].map((label) => ({
      childId: childThree.id,
      label,
      source: "preset",
    })),
    skipDuplicates: true,
  });

  const worksheet = await prisma.worksheet.create({
    data: {
      title: "Addition Basics",
      description: "Simple addition practice",
      subjectId: subject.id,
      ageGroup: "AGE_8_9",
      difficulty: "easy",
      questions: [
        { id: "q1", prompt: "2 + 3 = ?", options: ["4", "5", "6"], answer: "5" },
      ],
      answerKey: [{ id: "q1", answer: "5" }],
      explanations: [{ id: "q1", text: "Add 2 and 3 to get 5." }],
      isAiGenerated: true,
      isApproved: true,
      createdBy: adminUser.id,
    },
  });

  const existingScienceWorksheet = await prisma.worksheet.findFirst({
    where: { title: "Plant Life Cycle", subjectId: scienceSubject.id },
  });
  const scienceWorksheet =
    existingScienceWorksheet ??
    (await prisma.worksheet.create({
      data: {
        title: "Plant Life Cycle",
        description: "Stages of plant growth",
        subjectId: scienceSubject.id,
        ageGroup: "AGE_6_7",
        difficulty: "easy",
        questions: [
          {
            id: "q1",
            prompt: "What comes after a seed?",
            options: ["Flower", "Sprout", "Fruit"],
            answer: "Sprout",
          },
        ],
        answerKey: [{ id: "q1", answer: "Sprout" }],
        explanations: [{ id: "q1", text: "Seeds germinate into sprouts." }],
        isAiGenerated: true,
        isApproved: true,
        createdBy: adminUser.id,
      },
    }));

  const existingMathWorksheet = await prisma.worksheet.findFirst({
    where: { title: "Multiplication Challenge", subjectId: subject.id },
  });
  const mathWorksheet =
    existingMathWorksheet ??
    (await prisma.worksheet.create({
      data: {
        title: "Multiplication Challenge",
        description: "Practice multiplying two-digit numbers",
        subjectId: subject.id,
        ageGroup: "AGE_10_11",
        difficulty: "medium",
        questions: [
          { id: "q1", prompt: "12 x 3 = ?", options: ["36", "48", "33"], answer: "36" },
        ],
        answerKey: [{ id: "q1", answer: "36" }],
        explanations: [{ id: "q1", text: "12 multiplied by 3 equals 36." }],
        isAiGenerated: true,
        isApproved: true,
        createdBy: adminUser.id,
      },
    }));

  await prisma.worksheetAssignment.upsert({
    where: {
      worksheetId_childId: { worksheetId: worksheet.id, childId: child.id },
    },
    update: { assignedBy: parentUser.id },
    create: {
      worksheetId: worksheet.id,
      childId: child.id,
      assignedBy: parentUser.id,
    },
  });

  await prisma.worksheetAssignment.upsert({
    where: {
      worksheetId_childId: {
        worksheetId: scienceWorksheet.id,
        childId: childTwo.id,
      },
    },
    update: { assignedBy: parentUserTwo.id },
    create: {
      worksheetId: scienceWorksheet.id,
      childId: childTwo.id,
      assignedBy: parentUserTwo.id,
      status: "in_progress",
    },
  });

  await prisma.worksheetAssignment.upsert({
    where: {
      worksheetId_childId: {
        worksheetId: mathWorksheet.id,
        childId: childThree.id,
      },
    },
    update: { assignedBy: parentUserTwo.id },
    create: {
      worksheetId: mathWorksheet.id,
      childId: childThree.id,
      assignedBy: parentUserTwo.id,
      status: "completed",
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { id: "monthly" },
    update: {},
    create: {
      id: "monthly",
      name: "Monthly Plan",
      description: "Monthly access",
      priceMonthly: 1999,
      features: ["AI worksheets", "Progress tracking"],
      aiWorksheetLimit: 50,
      aiQuizLimit: 50,
      maxChildren: 3,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { id: "yearly" },
    update: {},
    create: {
      id: "yearly",
      name: "Yearly Plan",
      description: "Best value annual plan",
      priceYearly: 19999,
      features: ["All AI tools", "Priority support"],
      aiWorksheetLimit: 500,
      aiQuizLimit: 500,
      maxChildren: 10,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { id: "trial" },
    update: {},
    create: {
      id: "trial",
      name: "Trial Plan",
      description: "Limited trial access",
      priceMonthly: 0,
      features: ["Limited AI tools"],
      aiWorksheetLimit: 5,
      aiQuizLimit: 5,
      maxChildren: 1,
      isActive: true,
    },
  });

  const subscription = await prisma.subscription.upsert({
    where: { userId: parentUser.id },
    update: { status: "active", childId: child.id },
    create: {
      userId: parentUser.id,
      childId: child.id,
      plan: "monthly",
      status: "active",
      gateway: "payoneer",
      currency: "usd",
      amountPaid: 1999,
      amount: 1999,
      startDate: new Date(),
    },
  });

  const subscriptionTwo = await prisma.subscription.upsert({
    where: { userId: parentUserTwo.id },
    update: { status: "active", childId: childTwo.id },
    create: {
      userId: parentUserTwo.id,
      childId: childTwo.id,
      plan: "yearly",
      status: "active",
      gateway: "jazzcash",
      currency: "pkr",
      amountPaid: 29900,
      amount: 29900,
      startDate: new Date(),
    },
  });

  await prisma.paymentTransaction.upsert({
    where: {
      gateway_externalId: { gateway: "payoneer", externalId: "PAYONEER-TEST-001" },
    },
    update: { status: "succeeded" },
    create: {
      userId: parentUser.id,
      subscriptionId: subscription.id,
      gateway: "payoneer",
      amount: 1999,
      currency: "usd",
      status: "succeeded",
      externalId: "PAYONEER-TEST-001",
      referenceId: "REF-TEST-001",
      metadata: { source: "seed" },
    },
  });

  await prisma.paymentTransaction.upsert({
    where: {
      gateway_externalId: { gateway: "jazzcash", externalId: "JAZZCASH-TEST-001" },
    },
    update: { status: "succeeded" },
    create: {
      userId: parentUserTwo.id,
      subscriptionId: subscriptionTwo.id,
      gateway: "jazzcash",
      amount: 29900,
      currency: "pkr",
      status: "succeeded",
      externalId: "JAZZCASH-TEST-001",
      referenceId: "JAZZ-REF-001",
      metadata: { source: "seed", channel: "wallet" },
    },
  });

  await prisma.paymentTransaction.upsert({
    where: {
      gateway_externalId: { gateway: "easypaisa", externalId: "EASYPAISA-TEST-001" },
    },
    update: { status: "pending" },
    create: {
      userId: parentUserTwo.id,
      subscriptionId: subscriptionTwo.id,
      gateway: "easypaisa",
      amount: 29900,
      currency: "pkr",
      status: "pending",
      externalId: "EASYPAISA-TEST-001",
      referenceId: "EASY-REF-001",
      metadata: { source: "seed", channel: "card" },
    },
  });

  await prisma.progress.upsert({
    where: {
      childId_subjectId: { childId: child.id, subjectId: subject.id },
    },
    update: {
      totalWorksheets: 1,
      completedWorksheets: 1,
      totalScore: 95,
      averageScore: 95,
    },
    create: {
      childId: child.id,
      subjectId: subject.id,
      totalWorksheets: 1,
      completedWorksheets: 1,
      totalScore: 95,
      averageScore: 95,
    },
  });

  await prisma.progress.upsert({
    where: {
      childId_subjectId: { childId: childTwo.id, subjectId: scienceSubject.id },
    },
    update: {
      totalWorksheets: 2,
      completedWorksheets: 1,
      totalScore: 88,
      averageScore: 88,
    },
    create: {
      childId: childTwo.id,
      subjectId: scienceSubject.id,
      totalWorksheets: 2,
      completedWorksheets: 1,
      totalScore: 88,
      averageScore: 88,
    },
  });

  await prisma.progress.upsert({
    where: {
      childId_subjectId: { childId: childThree.id, subjectId: subject.id },
    },
    update: {
      totalWorksheets: 3,
      completedWorksheets: 2,
      totalScore: 180,
      averageScore: 90,
    },
    create: {
      childId: childThree.id,
      subjectId: subject.id,
      totalWorksheets: 3,
      completedWorksheets: 2,
      totalScore: 180,
      averageScore: 90,
    },
  });

  await prisma.analyticsEvent.create({
    data: {
      userId: parentUser.id,
      childId: child.id,
      worksheetId: worksheet.id,
      eventType: "worksheet_completed",
      eventData: { score: 95, durationSec: 420 },
    },
  });

  await prisma.analyticsEvent.create({
    data: {
      userId: parentUserTwo.id,
      childId: childTwo.id,
      worksheetId: scienceWorksheet.id,
      eventType: "worksheet_started",
      eventData: { progress: 50 },
    },
  });

  await prisma.notification.create({
    data: {
      userId: parentUserTwo.id,
      title: "Subscription Active",
      message: "Your yearly plan is now active.",
      type: "success",
    },
  });

  await prisma.notification.create({
    data: {
      userId: parentUser.id,
      title: "Welcome to Homeschooler",
      message: "Your account is ready. Start with the first worksheet!",
      type: "success",
    },
  });

  await seedStructuredCurriculumFile("age-4-5.json");
  await seedStructuredCurriculumFile("age-5-6.json");
  await seedStructuredCurriculumFile("age-6-7.json");
  await seedStructuredCurriculumFile("age-7-8.json");
  await seedStructuredCurriculumFile("age-8-9.json");
  await seedStructuredCurriculumFile("age-9-10.json");
  await seedStructuredCurriculumFile("age-10-11.json");
  await seedStructuredCurriculumFile("age-11-12.json");
  await seedStructuredCurriculumFile("age-12-13.json");

  console.log("Seed data created:", {
    adminUserId: adminUser.id,
    parentUserId: parentUser.id,
    parentUserTwoId: parentUserTwo.id,
    childId: child.id,
    childTwoId: childTwo.id,
    childThreeId: childThree.id,
    worksheetId: worksheet.id,
    scienceWorksheetId: scienceWorksheet.id,
    mathWorksheetId: mathWorksheet.id,
    subscriptionId: subscription.id,
    subscriptionTwoId: subscriptionTwo.id,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
