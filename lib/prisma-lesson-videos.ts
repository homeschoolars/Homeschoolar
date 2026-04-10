import { Prisma } from "@prisma/client"

/** User-facing hint when production DB was never migrated for `lesson_videos`. */
export const LESSON_VIDEOS_MIGRATION_HINT =
  "The lesson_videos table is missing. Run `npx prisma migrate deploy` against your production database. " +
  "If you deploy with Cloud Build, set the trigger substitution `_DATABASE_URL` to your production DATABASE_URL " +
  "so the prisma-migrate step runs on each deploy (see cloudbuild.yaml)."

/**
 * Detect Prisma errors when `lesson_videos` / Video model table has not been migrated.
 */
export function isLessonVideosTableMissingError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    const msg = `${e.message} ${JSON.stringify(e.meta ?? {})}`
    return msg.includes("lesson_videos")
  }
  if (e instanceof Error) {
    return e.message.includes("lesson_videos") && e.message.includes("does not exist")
  }
  return false
}
