// Returns the answer pretty-printed as a JSON string when it is JSON (an object/array, or a string
// holding one), or null for plain text. Bare numbers/strings/booleans are not treated as JSON output.
export function formatJsonAnswer(answer: unknown): string | null {
  let value = answer
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  return typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : null
}
