import { ResetPasswordClient } from "./reset-password-client"

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const token = params.token ?? ""
  return <ResetPasswordClient token={token} />
}
