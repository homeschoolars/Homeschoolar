import type {
  Child,
  Profile,
  Subject,
  Subscription,
  Worksheet,
  WorksheetAssignment,
  Progress,
  Notification,
  SurpriseQuiz,
  Assessment,
} from "@/lib/types"
import type {
  Child as DbChild,
  Subject as DbSubject,
  Subscription as DbSubscription,
  User,
  Worksheet as DbWorksheet,
  WorksheetAssignment as DbAssignment,
  Progress as DbProgress,
  Notification as DbNotification,
  SurpriseQuiz as DbQuiz,
  Assessment as DbAssessment,
} from "@prisma/client"
import { toApiAgeGroup } from "@/lib/age-group"

export function serializeProfile(user: User): Profile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.name ?? null,
    role: user.role,
    avatar_url: user.image ?? null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  }
}

export function serializeChild(child: DbChild): Child {
  return {
    id: child.id,
    parent_id: child.parentId,
    name: child.name,
    age_group: toApiAgeGroup(child.ageGroup),
    avatar_url: child.avatarUrl ?? null,
    login_code: child.loginCode,
    current_level: child.currentLevel,
    learning_style: child.learningStyle ?? null,
    interests: child.interests ?? null,
    is_orphan: child.isOrphan,
    orphan_status: child.orphanStatus as Child["orphan_status"],
    assessment_completed: child.assessmentCompleted,
    last_quiz_at: child.lastQuizAt?.toISOString() ?? null,
    created_at: child.createdAt.toISOString(),
    updated_at: child.updatedAt.toISOString(),
  }
}

export function serializeSubject(subject: DbSubject): Subject {
  return {
    id: subject.id,
    name: subject.name,
    description: subject.description ?? null,
    icon: subject.icon ?? null,
    color: subject.color ?? null,
    display_order: subject.displayOrder,
    created_at: subject.createdAt.toISOString(),
  }
}

export function serializeSubscription(subscription: DbSubscription): Subscription {
  return {
    id: subscription.id,
    user_id: subscription.userId,
    plan: subscription.plan,
    plan_type: subscription.planType ?? null,
    child_count: subscription.childCount,
    base_monthly_price: subscription.baseMonthlyPrice ?? null,
    discount_percentage: subscription.discountPercentage,
    discount_amount: subscription.discountAmount ?? null,
    final_amount: subscription.finalAmount ?? null,
    billing_currency: subscription.billingCurrency ?? null,
    type: subscription.type,
    trial_ends_at: subscription.trialEndsAt?.toISOString() ?? null,
    is_free: subscription.isFree,
    status: subscription.status,
    stripe_customer_id: subscription.stripeCustomerId ?? null,
    stripe_subscription_id: subscription.stripeSubscriptionId ?? null,
    current_period_start: subscription.currentPeriodStart?.toISOString() ?? null,
    current_period_end: subscription.currentPeriodEnd?.toISOString() ?? null,
    created_at: subscription.createdAt.toISOString(),
    updated_at: subscription.updatedAt.toISOString(),
    started_at: subscription.startedAt?.toISOString() ?? null,
    expires_at: subscription.expiresAt?.toISOString() ?? null,
    coupon_code: subscription.couponCode ?? null,
    pricing_metadata: (subscription.pricingMetadata as Record<string, unknown>) ?? null,
  }
}

export function serializeWorksheet(worksheet: DbWorksheet): Worksheet {
  return {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description ?? null,
    subject_id: worksheet.subjectId,
    age_group: toApiAgeGroup(worksheet.ageGroup),
    difficulty: worksheet.difficulty,
    questions: (worksheet.questions as unknown as Worksheet["questions"]) ?? [],
    answer_key: (worksheet.answerKey as unknown as Worksheet["answer_key"]) ?? null,
    explanations: (worksheet.explanations as unknown as Worksheet["explanations"]) ?? null,
    ai_prompt: worksheet.aiPrompt ?? null,
    is_ai_generated: worksheet.isAiGenerated,
    is_approved: worksheet.isApproved,
    created_by: worksheet.createdBy ?? null,
    created_at: worksheet.createdAt.toISOString(),
    updated_at: worksheet.updatedAt.toISOString(),
  }
}

export function serializeAssignment(assignment: DbAssignment & { worksheet?: DbWorksheet | null }): WorksheetAssignment {
  return {
    id: assignment.id,
    worksheet_id: assignment.worksheetId,
    child_id: assignment.childId,
    assigned_by: assignment.assignedBy,
    due_date: assignment.dueDate?.toISOString() ?? null,
    status: assignment.status,
    created_at: assignment.createdAt.toISOString(),
    worksheet: assignment.worksheet ? serializeWorksheet(assignment.worksheet) : undefined,
  }
}

export function serializeProgress(progress: DbProgress): Progress {
  return {
    id: progress.id,
    child_id: progress.childId,
    subject_id: progress.subjectId,
    total_worksheets: progress.totalWorksheets,
    completed_worksheets: progress.completedWorksheets,
    total_score: Number(progress.totalScore),
    average_score: Number(progress.averageScore),
    last_activity_at: progress.lastActivityAt?.toISOString() ?? null,
    updated_at: progress.updatedAt.toISOString(),
  }
}

export function serializeNotification(notification: DbNotification): Notification {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    is_read: notification.isRead,
    created_at: notification.createdAt.toISOString(),
  }
}

export function serializeSurpriseQuiz(quiz: DbQuiz): SurpriseQuiz {
  return {
    id: quiz.id,
    child_id: quiz.childId,
    subject_id: quiz.subjectId,
    questions: quiz.questions as unknown as SurpriseQuiz["questions"],
    answers: (quiz.answers as unknown as SurpriseQuiz["answers"]) ?? null,
    score: quiz.score ?? null,
    max_score: quiz.maxScore ?? null,
    feedback: quiz.feedback ?? null,
    started_at: quiz.startedAt.toISOString(),
    completed_at: quiz.completedAt?.toISOString() ?? null,
    created_at: quiz.createdAt.toISOString(),
  }
}

export function serializeAssessment(assessment: DbAssessment): Assessment {
  return {
    id: assessment.id,
    child_id: assessment.childId,
    subject_id: assessment.subjectId,
    questions: assessment.questions as unknown as Assessment["questions"],
    answers: (assessment.answers as unknown as Assessment["answers"]) ?? null,
    score: assessment.score ?? null,
    recommended_level: assessment.recommendedLevel as Assessment["recommended_level"],
    completed_at: assessment.completedAt?.toISOString() ?? null,
    created_at: assessment.createdAt.toISOString(),
  }
}
