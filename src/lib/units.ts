import index from '../../public/units/index.json'
import type { Level } from '../types'

/**
 * Units: game content made from Henry's Gamma lessons (one JSON file per unit in public/units/).
 * Picked on the team setup screen for games marked "units": true in games.json; the game loads the file.
 */
export interface UnitInfo {
  id: string
  level: Level
  course: string
  title: string
}

export const UNITS: UnitInfo[] = (index as { units: UnitInfo[] }).units

/** The units a game can offer for a level, in the order they're listed. */
export function unitsFor(level: Level | null | undefined): UnitInfo[] {
  return UNITS.filter((u) => u.level === level)
}
