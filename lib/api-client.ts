export function apiFetch(input: string, init?: RequestInit) {
  // In the browser, always call the current origin so httpOnly cookies (e.g. student session) are sent.
  // NEXT_PUBLIC_BACKEND_URL is only for server-side fetches to another host.
  const isBrowser = typeof window !== "undefined"
  const baseUrl =
    isBrowser || input.startsWith("http")
      ? ""
      : process.env.NEXT_PUBLIC_BACKEND_URL || ""
  const url =
    baseUrl === "" ? input : `${baseUrl}${input.startsWith("/") ? input : `/${input}`}`

  return fetch(url, {
    credentials: "include",
    ...init,
  })
}
