/** Pure helpers for the Rosters screen: pasting a list in, and merging or replacing a roster. */

export interface RosterRow {
  no: number
  nick: string
  active: boolean
}

export interface PastedRow {
  no: number | null
  nick: string
}

const isNum = (s: string) => /^\d{1,3}$/.test(s.trim())

/**
 * Reads two columns pasted from a spreadsheet ("1 [tab] Name"), or comma separated, or one name per line.
 * Header lines ("No  Nickname") are skipped. Rows without a number are numbered after the highest number.
 */
export function parsePasted(text: string, startAfter = 0): PastedRow[] {
  const rows: PastedRow[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = (line.includes('\t') ? line.split('\t') : line.includes(',') ? line.split(',') : line.split(/\s{2,}|\s(?=\S+$)/))
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      if (!isNum(parts[0])) rows.push({ no: null, nick: parts[0] })
      continue
    }
    const [a, b] = parts
    if (isNum(a)) rows.push({ no: Number(a), nick: b })
    else if (isNum(b)) rows.push({ no: Number(b), nick: a })
    else if (rows.length === 0 && /^(no\.?|number|#|เลขที่)$/i.test(a)) continue // header line
    else rows.push({ no: null, nick: parts.join(' ') })
  }
  let next = Math.max(startAfter, ...rows.map((r) => r.no ?? 0))
  return rows.map((r) => (r.no == null ? { no: ++next, nick: r.nick } : r))
}

/** Merge: pasted students are added (or their nickname updated, by number). Everyone else stays as they are. */
export function mergeRoster(existing: RosterRow[], pasted: PastedRow[]): RosterRow[] {
  const out = existing.map((r) => ({ ...r }))
  for (const p of pasted) {
    const same = out.find((r) => r.no === p.no)
    if (same) {
      same.nick = p.nick
      same.active = true
    } else out.push({ no: p.no ?? 0, nick: p.nick, active: true })
  }
  return out.sort((a, b) => a.no - b.no)
}

/**
 * Replace: the pasted list becomes the active class. Students not in it are kept but marked
 * inactive, so their past results still make sense.
 */
export function replaceRoster(existing: RosterRow[], pasted: PastedRow[]): RosterRow[] {
  const key = (no: number | null, nick: string) => `${no}|${nick.toLowerCase()}`
  const pastedKeys = new Set(pasted.map((p) => key(p.no, p.nick)))
  const kept = existing.filter((r) => !pastedKeys.has(key(r.no, r.nick))).map((r) => ({ ...r, active: false }))
  return [...pasted.map((p) => ({ no: p.no ?? 0, nick: p.nick, active: true })), ...kept].sort((a, b) => a.no - b.no || Number(b.active) - Number(a.active))
}

/** Numbers used by more than one row (shown as a warning; allowed for mixed classes). */
export function sharedNumbers(rows: RosterRow[]): number[] {
  const seen = new Map<number, number>()
  for (const r of rows) seen.set(r.no, (seen.get(r.no) ?? 0) + 1)
  return [...seen].filter(([, n]) => n > 1).map(([no]) => no)
}
