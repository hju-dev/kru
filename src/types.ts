export type Level = 'M.1' | 'M.2' | 'M.3'

export interface Student {
  no: number
  nick: string
  active: boolean
}

export interface ClassInfo {
  name: string // e.g. "M.3/2"
  level: Level | null // worked out from the name: "M.3/2" -> "M.3"
  archived: boolean
  defaultTeamSize: number | null
  order: number
}

export interface TeamSetMember {
  no: number
  nick: string
}

export interface TeamSet {
  id: string
  class: string
  name: string
  savedAt: string | null
  teams: { name: string; members: TeamSetMember[] }[]
}

/** Everything the app needs from the Sheet, fetched by "bootstrap". */
export interface Bootstrap {
  classes: ClassInfo[]
  rosters: Record<string, Student[]>
  teamSets: TeamSet[]
  sheetUrl: string | null
}

/** Where the app's Apps Script lives. Stored on the device only. */
export interface Connection {
  url: string // ".../exec", or "demo"
  key: string
}
