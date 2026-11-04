import raw from '../../games.json'
import type { Level } from '../types'
import type { Mode } from './session'

/** Library sections: A-Z, with Tools last (Henry). Colours match the theme. */
export type SectionId = 'quizzes' | 'reading' | 'speaking' | 'writing' | 'tools'
export const SECTIONS: { id: SectionId; title: string; color: string }[] = [
  { id: 'quizzes', title: 'Quizzes', color: '#9b7bff' },
  { id: 'reading', title: 'Reading', color: '#4cc9f0' },
  { id: 'speaking', title: 'Speaking', color: '#ff6b6b' },
  { id: 'writing', title: 'Writing', color: '#2ec4b6' },
  { id: 'tools', title: 'Tools', color: '#ffb703' },
]

export interface GameInfo {
  slug: string
  title: string
  description?: string
  levels: Level[]
  modes: Mode[]
  minutes: number | null
  type?: string
  /** 'scored' = only students who got points are written to Results (Name Picker); 'scored-solo' = the same, but only in Solo mode (20 Questions) */
  results?: 'scored' | 'scored-solo'
  /** true = a class tool (Name Picker): pick a class, then it opens straight away with no team setup */
  classTool?: boolean
  /** true = the game gets the Sheet's Questions tab sets for its level (Quiz Battle) */
  sheetQuestions?: boolean
  /** ready = playable; migrate / new = coming in a later phase */
  status: 'ready' | 'migrate' | 'new'
  section: SectionId
}

export const GAMES = raw as GameInfo[]

/** The library: each section with its games A-Z; empty sections are left out. */
export function librarySections(games: GameInfo[] = GAMES) {
  return SECTIONS.map((s) => ({
    ...s,
    games: games.filter((g) => g.section === s.id).sort((a, b) => a.title.localeCompare(b.title, 'en')),
  })).filter((s) => s.games.length > 0)
}

export const findGame = (slug: string) => GAMES.find((g) => g.slug === slug)

/** Every game is its own page, loaded in a same-origin frame. */
export const gameUrl = (slug: string) => `/games/${slug}/index.html`
