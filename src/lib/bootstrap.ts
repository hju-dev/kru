import type { Bootstrap, ClassInfo, Level, RosterIssue, Student, TeamSet } from '../types'

/** "M.3/2", "3/2" or "3/2P" -> "M.3". Returns null if the class name has no M.1–M.3 grade in it. */
export function levelFromClass(name: string): Level | null {
  const m = /M\s*\.?\s*([1-3])/i.exec(name) ?? /^\s*([1-3])\s*\//.exec(name)
  return m ? (`M.${m[1]}` as Level) : null
}

/** Natural sort so "M.1/10" comes after "M.1/9". */
export function compareClassNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
}

const str = (v: unknown) => (v == null ? '' : String(v).trim())
const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Checks and tidies what the Apps Script sent back, so the rest of the app can trust it.
 * Throws if the shape is clearly wrong (e.g. an old script version).
 */
export function normalizeBootstrap(raw: unknown): Bootstrap {
  if (!raw || typeof raw !== 'object') throw new Error('Empty reply from the Sheet')
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.classes) || !r.rosters || typeof r.rosters !== 'object') {
    throw new Error('The Sheet sent data in an unexpected shape. Is the latest Code.gs deployed?')
  }

  const rosters: Record<string, Student[]> = {}
  const rosterIssues: RosterIssue[] = []
  for (const [cls, list] of Object.entries(r.rosters as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const result = cleanRoster(str(cls), list)
    rosters[str(cls)] = result.students
    rosterIssues.push(...result.issues)
  }

  const classes: ClassInfo[] = (r.classes as unknown[])
    .map((c, i): ClassInfo | null => {
      const o = c as Record<string, unknown>
      const name = str(o.name)
      if (!name) return null
      return {
        name,
        level: levelFromClass(name),
        archived: o.archived === true,
        defaultTeamSize: num(o.defaultTeamSize) || null,
        order: num(o.order) ?? 1000 + i,
      }
    })
    .filter((c): c is ClassInfo => c !== null)
    .sort((a, b) => a.order - b.order || compareClassNames(a.name, b.name))

  const teamSets: TeamSet[] = Array.isArray(r.teamSets)
    ? (r.teamSets as unknown[]).map((t) => {
        const o = t as Record<string, unknown>
        return {
          id: str(o.id),
          class: str(o.class),
          name: str(o.name),
          savedAt: o.savedAt ? str(o.savedAt) : null,
          teams: Array.isArray(o.teams)
            ? (o.teams as Record<string, unknown>[]).map((tm) => ({
                name: str(tm.name),
                members: Array.isArray(tm.members)
                  ? (tm.members as Record<string, unknown>[]).map((m) => ({ no: num(m.no) ?? 0, nick: str(m.nick) }))
                  : [],
              }))
            : [],
        }
      })
    : []

  return { classes, rosters, teamSets, sheetUrl: r.sheetUrl ? str(r.sheetUrl) : null, rosterIssues }
}

/**
 * Tidies one class's roster:
 * - the same number + nickname typed twice is one student (a duplicate row)
 * - two different students sharing a number are both kept, with separate ids
 */
export function cleanRoster(cls: string, list: unknown[]): { students: Student[]; issues: RosterIssue[] } {
  const rows: Omit<Student, 'id'>[] = []
  const dupes = new Map<number, string>()
  for (const s of list) {
    const o = s as Record<string, unknown>
    const no = num(o.no)
    const nick = str(o.nick)
    if (no == null || !nick) continue
    const first = rows.find((x) => x.no === no && x.nick.toLowerCase() === nick.toLowerCase())
    if (first) {
      dupes.set(no, nick)
      if (o.active !== false) first.active = true // a duplicate row counts as active if either copy is ticked
      continue
    }
    rows.push({ no, nick, active: o.active !== false })
  }
  rows.sort((a, b) => a.no - b.no)

  const used = new Set<number>()
  let extra = 1000
  const students: Student[] = rows.map((s) => {
    let id = s.no
    if (used.has(id)) {
      while (used.has(extra)) extra++
      id = extra++
    }
    used.add(id)
    return { id, ...s }
  })

  const issues: RosterIssue[] = [...dupes].map(([no, nick]) => ({ class: cls, kind: 'duplicate-row' as const, no, nicks: [nick] }))
  const byNo = new Map<number, string[]>()
  for (const s of students) byNo.set(s.no, [...(byNo.get(s.no) ?? []), s.nick])
  for (const [no, nicks] of byNo) if (nicks.length > 1) issues.push({ class: cls, kind: 'shared-number', no, nicks })
  return { students, issues }
}

/** Data saved on the phone by an older Kru version (before student ids): bring it up to date. */
export function upgradeCachedBootstrap(data: Bootstrap): Bootstrap {
  const needsIds = Object.values(data.rosters).some((list) => list.some((s) => typeof s.id !== 'number'))
  if (!needsIds && Array.isArray(data.rosterIssues)) return data
  const rosters: Record<string, Student[]> = {}
  const rosterIssues: RosterIssue[] = []
  for (const [cls, list] of Object.entries(data.rosters)) {
    const result = cleanRoster(cls, list)
    rosters[cls] = result.students
    rosterIssues.push(...result.issues)
  }
  return { ...data, rosters, rosterIssues }
}

/** Class names match ignoring spaces and capitals (same rule as the Sheet script). */
export function classKeyOf(name: string): string {
  return name.replace(/\s+/g, '').toUpperCase()
}

/** The saved team sets for one class (class names match ignoring spaces and capitals). */
export function teamSetsForClass(sets: TeamSet[] | undefined, cls: string): TeamSet[] {
  const key = classKeyOf(cls)
  return (sets ?? []).filter((t) => classKeyOf(t.class) === key)
}
