const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const parentPasswordHash = await bcrypt.hash("Parent123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@homeschooler.local" },
    update: { name: "Admin User", role: "admin", adminRole: "super_admin" },
    create: {
      email: "admin@homeschooler.local",
      name: "Admin User",
      role: "admin",
      adminRole: "super_admin",
      passwordHash: adminPasswordHash,
    },
  });

  const parentUser = await prisma.user.upsert({
    where: { email: "parent@homeschooler.local" },
    update: { name: "Parent User", role: "parent" },
    create: {
      email: "parent@homeschooler.local",
      name: "Parent User",
      role: "parent",
      passwordHash: parentPasswordHash,
    },
  });

  const parentUserTwo = await prisma.user.upsert({
    where: { email: "parent2@homeschooler.local" },
    update: { name: "Second Parent", role: "parent" },
    create: {
      email: "parent2@homeschooler.local",
      name: "Second Parent",
      role: "parent",
      passwordHash: parentPasswordHash,
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
    { name: "Social Studies", description: "People, places, and history", color: "#0EA5E9", displayOrder: 4 },
    { name: "Art & Creativity", description: "Creative thinking and expression", color: "#F97316", displayOrder: 5 },
    { name: "Life Skills", description: "Habits, values, and daily skills", color: "#8B5CF6", displayOrder: 6 },
    { name: "Physical Education", description: "Movement, fitness, and wellness", color: "#F59E0B", displayOrder: 7 },
    { name: "Financial Literacy", description: "Money basics and smart choices", color: "#22C55E", displayOrder: 8 },
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
