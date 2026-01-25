-- CreateTable
CREATE TABLE "lesson_contents" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "age_group" "AgeGroup" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "script" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_quizzes" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "age_group" "AgeGroup" NOT NULL,
    "questions" JSONB NOT NULL,
    "max_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_contents_subject_id_topic_concept_id_age_group_langu_key" ON "lesson_contents"("subject_id", "topic", "concept_id", "age_group", "language");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_quizzes_subject_id_topic_concept_id_age_group_key" ON "lesson_quizzes"("subject_id", "topic", "concept_id", "age_group");

-- AddForeignKey
ALTER TABLE "lesson_contents" ADD CONSTRAINT "lesson_contents_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_quizzes" ADD CONSTRAINT "lesson_quizzes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
