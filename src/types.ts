export type Level = 'M.1' | 'M.2' | 'M.3'

export interface Student {
  /**
   * Kru's own identity for this student within the class. Equals `no` unless two students in
   * the class share a number (then the later one gets 1000+). Never shown, never sent to the Sheet.
   */
  id: number
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
  /** Roster rows that look wrong (duplicates, shared numbers), to show Henry in Settings. */
  rosterIssues: RosterIssue[]
  /** Quiz Battle sets from the Questions tab (Code.gs v6+; missing with older scripts or old caches). */
  questions?: QuizSet[]
  /** Questions tab rows that couldn't be used. */
  questionProblems?: { row: number; problem: string }[]
}

export interface QuizQuestion {
  q: string
  /** multiple choice; absent = short answer */
  choices?: string[]
  /** index into choices, or the short answer text */
  answer: number | string
  double: boolean
}

export interface QuizSet {
  level: Level
  name: string
  questions: QuizQuestion[]
}

export interface RosterIssue {
  class: string
  kind: 'duplicate-row' | 'shared-number'
  no: number
  nicks: string[]
}

/** Where the app's Apps Script lives. Stored on the device only. */
export interface Connection {
  url: string // ".../exec", or "demo"
  key: string
}
