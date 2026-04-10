-- CreateTable
CREATE TABLE "lesson_videos" (
    "id" TEXT NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "duration" TEXT,
    "lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_videos_lesson_id_youtube_video_id_key" ON "lesson_videos"("lesson_id", "youtube_video_id");

-- CreateIndex
CREATE INDEX "lesson_videos_lesson_id_idx" ON "lesson_videos"("lesson_id");

-- AddForeignKey
ALTER TABLE "lesson_videos" ADD CONSTRAINT "lesson_videos_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
