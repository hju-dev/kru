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
  /** true = the setup screen offers a unit (content from Henry's Gamma lessons) for the level */
  units?: boolean
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

/** Games whose id changed: old saved sessions, favorites and recents use the old id (Quiz Board became Jeopardy, Reading Think Tank became Reading Island, Nov 2026). */
export const RENAMED_GAMES: Record<string, string> = { 'quiz-board': 'jeopardy', 'reading-think-tank': 'reading-island' }
export const currentSlug = (slug: string) => RENAMED_GAMES[slug] ?? slug

export const findGame = (slug: string) => GAMES.find((g) => g.slug === currentSlug(slug))

/** Games taken out of the library (Henry). Their old sessions can still be reviewed and saved under this title. */
export const RETIRED_GAMES: Record<string, string> = {
  'just-a-minute': 'Just a Second', // merged into Tag-Team Talk (Nov 2026)
  // merged into Reading Island (Nov 2026)
  'read-remember': 'Read & Remember',
  'scan-it': 'Scan It!',
  'spot-the-mistakes': 'Spot the Mistakes',
  'story-order': 'Story Order',
  'true-false-race': 'True or False Race',
}

/** A game's title for screens and the Sheet, also for retired games. */
export const gameTitle = (slug: string) => findGame(slug)?.title ?? RETIRED_GAMES[slug] ?? slug

/** Every game is its own page, loaded in a same-origin frame. */
export const gameUrl = (slug: string) => `/games/${currentSlug(slug)}/index.html`
