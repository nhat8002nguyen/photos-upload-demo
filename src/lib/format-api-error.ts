/** Turn Zod-style fieldErrors or a string API `error` into a single user-facing message. */
export function formatAuthApiError(error: unknown): string {
  if (typeof error === "string") {
    return error
  }
  if (error && typeof error === "object" && !Array.isArray(error)) {
    const parts: string[] = []
    for (const [key, val] of Object.entries(error as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        const msgs = val.filter((x): x is string => typeof x === "string")
        if (msgs.length) {
          parts.push(`${key}: ${msgs.join(", ")}`)
        }
      }
    }
    if (parts.length) {
      return parts.join(" · ")
    }
  }
  return "Something went wrong. Please try again."
}
