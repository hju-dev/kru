/** "just now", "5 min ago", "today 14:05", "3 Nov 14:05" */
export function timeAgo(ts: number | null, now = Date.now()): string {
  if (!ts) return 'never'
  const mins = Math.round((now - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const d = new Date(ts)
  const hhmm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (new Date(now).toDateString() === d.toDateString()) return `today ${hhmm}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${hhmm}`
}
