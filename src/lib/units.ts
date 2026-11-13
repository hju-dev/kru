import index from '../../public/units/index.json'
import type { Level } from '../types'

/**
 * Units: game content made from Henry's Gamma lessons (one JSON file per unit in public/units/).
 * Picked on the team setup screen for games marked "units": true in games.json; the game loads the file.
 * A lesson pack (e.g. Unit 8 L1) can list the games it is for and the classes it is for; it then shows only there.
 */
export interface UnitInfo {
  id: string
  level: Level
  course: string
  title: string
  /** Game slugs this pack is for; missing = a full unit, for FULL_UNIT_GAMES. */
  games?: string[]
  /** Classes this pack is for (e.g. "M.3/2"); missing = every class of the level. */
  classes?: string[]
}

export const UNITS: UnitInfo[] = (index as { units: UnitInfo[] }).units

/** The games a full unit (sets, words, motions; no "games" list) works in. */
export const FULL_UNIT_GAMES = ['hot-seat-vocab', 'quiz-battle', 'quiz-board', 'race-board', 'tag-team-debate']

/** "M.3/2", "m.3 / 2" and "3/2" are the same class. */
export function classKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').replace(/^m\.?(?=\d)/, '')
}

/**
 * The units a game can offer for a level (and class), in the order they're listed.
 * Leave out the game or class to skip that check (practice mode has no class).
 */
export function unitsFor(level: Level | null | undefined, game?: string, className?: string): UnitInfo[] {
  return UNITS.filter(
    (u) =>
      u.level === level &&
      (!game || (u.games ?? FULL_UNIT_GAMES).includes(game)) &&
      (className == null || !u.classes || u.classes.some((c) => classKey(c) === classKey(className))),
  )
}
