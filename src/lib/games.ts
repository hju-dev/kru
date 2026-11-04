import raw from '../../games.json'
import type { Level } from '../types'
import type { Mode } from './session'

export interface GameInfo {
  slug: string
  title: string
  description?: string
  levels: Level[]
  modes: Mode[]
  minutes: number | null
  type?: string
  /** ready = playable; migrate / new = coming in a later phase */
  status: 'ready' | 'migrate' | 'new'
}

export const GAMES = raw as GameInfo[]

export const findGame = (slug: string) => GAMES.find((g) => g.slug === slug)

/** Every game is its own page, loaded in a same-origin frame. */
export const gameUrl = (slug: string) => `/games/${slug}/index.html`
