-- Child.learningGoals → students.learning_goals (was in schema but never migrated)

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "learning_goals" TEXT;
