export function apiFetch(input: string, init?: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ""
  const url =
    input.startsWith("http") || baseUrl === ""
      ? input
      : `${baseUrl}${input.startsWith("/") ? input : `/${input}`}`

  return fetch(url, {
    credentials: "include",
    ...init,
  })
}
