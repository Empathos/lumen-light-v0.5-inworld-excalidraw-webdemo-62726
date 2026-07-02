/** Shared text helpers. Keep dependency-free: consumed by canvas, assistant, and tests. */

/** Collapse whitespace and cap at n chars with a trailing ellipsis. */
export function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean
}

/** Shorten a URL to a readable host (e.g. "cnn.com"); falls back to a truncated string. */
export function hostOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return truncate(url, 40)
  }
}
