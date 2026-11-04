import type { Bootstrap, ClassInfo, Level, Student, TeamSet } from '../types'

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
  for (const [cls, list] of Object.entries(r.rosters as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    rosters[str(cls)] = list
      .map((s): Student | null => {
        const o = s as Record<string, unknown>
        const no = num(o.no)
        const nick = str(o.nick)
        if (no == null || !nick) return null
        return { no, nick, active: o.active !== false }
      })
      .filter((s): s is Student => s !== null)
      .sort((a, b) => a.no - b.no)
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

  return { classes, rosters, teamSets, sheetUrl: r.sheetUrl ? str(r.sheetUrl) : null }
}
