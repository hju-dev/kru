/**
 * Pure team-setup logic (no React), so it can be unit-tested.
 * Bins hold student numbers; names are looked up from the roster when the game starts.
 */

export interface Bin {
  id: string
  name: string
  members: number[] // student numbers
}

export const TEACHER_TEAM_ID = 't0'

export function newBinId(): string {
  return 't' + Math.random().toString(36).slice(2, 8)
}

/** How many teams for this many present students: rounded up, at least 1. */
export function binCountFor(present: number, size: number): number {
  return Math.max(1, Math.ceil(present / Math.max(1, size)))
}

/** Grow or shrink to `count` bins. Kept bins keep their members; removed bins' members go back to the pool. */
export function resizeBins(bins: Bin[], count: number): Bin[] {
  const kept = bins.slice(0, count)
  const used = new Set(kept.map((b) => b.name))
  let n = 1
  while (kept.length < count) {
    while (used.has(`Team ${n}`)) n++
    used.add(`Team ${n}`)
    kept.push({ id: newBinId(), name: `Team ${n}`, members: [] })
  }
  return kept
}

/** Students who are present but not in any bin, in roster order. */
export function unassigned(presentNos: number[], bins: Bin[]): number[] {
  const inBins = new Set(bins.flatMap((b) => b.members))
  return presentNos.filter((no) => !inBins.has(no))
}

/** Move students into a bin (or back to the pool when target is null). */
export function moveTo(bins: Bin[], nos: number[], target: string | null): Bin[] {
  const moving = new Set(nos)
  return bins.map((b) =>
    b.id === target
      ? { ...b, members: [...b.members, ...nos.filter((no) => !b.members.includes(no))] }
      : { ...b, members: b.members.filter((no) => !moving.has(no)) },
  )
}

/** Take students out of every bin (e.g. when marked absent). */
export function removeFromBins(bins: Bin[], nos: number[]): Bin[] {
  return moveTo(bins, nos, null)
}

function shuffled<T>(list: T[], rand: () => number): T[] {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Random, balanced teams: sizes differ by at most one. Team names are kept. */
export function shuffleTeams(bins: Bin[], presentNos: number[], rand: () => number = Math.random): Bin[] {
  if (bins.length === 0) return bins
  const out = bins.map((b) => ({ ...b, members: [] as number[] }))
  // start at a random bin so the "extra" students don't always land in Team 1
  const offset = Math.floor(rand() * out.length)
  shuffled(presentNos, rand).forEach((no, i) => out[(i + offset) % out.length].members.push(no))
  return out
}

/** Put each unassigned student into the currently smallest team. */
export function fillEvenly(bins: Bin[], presentNos: number[]): Bin[] {
  if (bins.length === 0) return bins
  const out = bins.map((b) => ({ ...b, members: b.members.slice() }))
  for (const no of unassigned(presentNos, out)) {
    let smallest = out[0]
    for (const b of out) if (b.members.length < smallest.members.length) smallest = b
    smallest.members.push(no)
  }
  return out
}

export function clearBins(bins: Bin[]): Bin[] {
  return bins.map((b) => ({ ...b, members: [] }))
}

/**
 * Apply a saved team set to today's class: keep only students who are present today.
 * Students not in the saved set stay in the pool.
 */
export function binsFromTeamSet(teams: { name: string; members: { no: number }[] }[], presentNos: number[]): Bin[] {
  const present = new Set(presentNos)
  return teams.map((t) => ({
    id: newBinId(),
    name: t.name,
    members: t.members.map((m) => m.no).filter((no) => present.has(no)),
  }))
}
