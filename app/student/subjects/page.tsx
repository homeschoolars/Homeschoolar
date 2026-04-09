import { redirect } from "next/navigation"

/** Legacy / mistaken URL from older links; student subjects live on `/student`. */
export default function StudentSubjectsRedirectPage() {
  redirect("/student")
}
