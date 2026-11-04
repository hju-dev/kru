import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Load Code.gs into a sandbox so its pure functions can be tested without Google.
const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const sandbox: Record<string, unknown> = {}
runInNewContext(code, sandbox)
const buildBootstrap = sandbox.buildBootstrap_ as (c: object[], r: object[], t: object[]) => {
  classes: { name: string; archived: boolean; defaultTeamSize: number | null; order: number }[]
  rosters: Record<string, { no: number; nick: string; active: boolean }[]>
  teamSets: { id: string; class: string; name: string; teams: { name: string; members: { no: number; nick: string }[] }[] }[]
}

describe('Code.gs classText_', () => {
  const classText = sandbox.classText_ as (v: unknown, d: { monthFirst: boolean }) => string
  // Dates made inside the sandbox, as Sheets would hand them to the script
  const sheetDate = (y: number, m: number, d: number) => runInNewContext(`new Date(${y}, ${m}, ${d})`, sandbox)

  it('turns a class Sheets converted to a date back into what was typed', () => {
    // US-style Sheet: typing "1/2" becomes 2 January
    expect(classText(sheetDate(2026, 0, 2), { monthFirst: true })).toBe('1/2')
    // Thai/UK-style Sheet: typing "1/2" becomes 1 February
    expect(classText(sheetDate(2026, 1, 1), { monthFirst: false })).toBe('1/2')
  })
  it('leaves normal text alone', () => {
    expect(classText(' M.3/2 ', { monthFirst: true })).toBe('M.3/2')
    expect(classText('3/2P', { monthFirst: false })).toBe('3/2P')
  })
})

describe('Code.gs buildBootstrap_', () => {
  it('groups rosters by class, sorts by number, and reads tick boxes', () => {
    const out = buildBootstrap(
      [],
      [
        { Class: 'M.3/2', No: 2, Nickname: 'S2', Active: true },
        { Class: 'M.3/2', No: 1, Nickname: ' S1 ', Active: '' },
        { Class: 'M.3/2', No: 3, Nickname: 'S3', Active: false },
        { Class: 'M.1/2', No: 1, Nickname: 'S1', Active: 'no' },
      ],
      [],
    )
    expect(out.rosters['M.3/2']).toEqual([
      { no: 1, nick: 'S1', active: true },
      { no: 2, nick: 'S2', active: true },
      { no: 3, nick: 'S3', active: false },
    ])
    expect(out.rosters['M.1/2'][0].active).toBe(false)
    expect(out.classes.map((c) => c.name)).toEqual(['M.3/2', 'M.1/2'])
  })

  it('skips blank and half-filled roster rows', () => {
    const out = buildBootstrap(
      [],
      [
        { Class: 'M.2/1', No: '', Nickname: 'S9', Active: true },
        { Class: '', No: 4, Nickname: 'S4', Active: true },
        { Class: 'M.2/1', No: 5, Nickname: '', Active: true },
        { Class: 'M.2/1', No: 6, Nickname: 'S6', Active: true },
      ],
      [],
    )
    expect(out.rosters['M.2/1']).toEqual([{ no: 6, nick: 'S6', active: true }])
  })

  it('uses the Classes tab for order, archived and team size; keeps empty classes', () => {
    const out = buildBootstrap(
      [
        { Class: 'M.3/3', Archived: '', DefaultTeamSize: 5, Order: 2 },
        { Class: 'M.1/2', Archived: true, DefaultTeamSize: '', Order: 1 },
      ],
      [{ Class: 'M.2/2', No: 1, Nickname: 'S1', Active: true }],
      [],
    )
    expect(out.classes).toEqual([
      { name: 'M.3/3', archived: false, defaultTeamSize: 5, order: 2 },
      { name: 'M.1/2', archived: true, defaultTeamSize: null, order: 1 },
      expect.objectContaining({ name: 'M.2/2', archived: false }),
    ])
    expect(out.rosters['M.3/3']).toEqual([])
  })

  it('treats class names that differ only in spaces or capitals as one class', () => {
    const out = buildBootstrap(
      [{ Class: '3/2P', Archived: '', DefaultTeamSize: '', Order: 1 }],
      [
        { Class: '3/2 P', No: 2, Nickname: 'S2', Active: true },
        { Class: '3/2p', No: 1, Nickname: 'S1', Active: true },
        { Class: '3/3 P', No: 1, Nickname: 'S1', Active: true },
      ],
      [{ SetID: 'x', Class: '3/2 p', Name: 'Teams', Team: 'A', No: 1, Nickname: 'S1', SavedAt: '' }],
    )
    expect(out.classes.map((c) => c.name)).toEqual(['3/2P', '3/3 P'])
    expect(out.rosters['3/2P'].map((s) => s.no)).toEqual([1, 2])
    expect(out.rosters['3/3 P']).toHaveLength(1)
    expect(Object.keys(out.rosters)).toEqual(['3/2P', '3/3 P'])
    expect(out.teamSets[0].class).toBe('3/2P')
  })

  it('rebuilds saved team sets from one row per member', () => {
    const out = buildBootstrap(
      [],
      [],
      [
        { SetID: 'a1', Class: 'M.3/2', Name: 'Debate teams', Team: 'Dragons', No: 1, Nickname: 'S1', SavedAt: '' },
        { SetID: 'a1', Class: 'M.3/2', Name: 'Debate teams', Team: 'Dragons', No: 2, Nickname: 'S2', SavedAt: '' },
        { SetID: 'a1', Class: 'M.3/2', Name: 'Debate teams', Team: 'Team 2', No: 3, Nickname: 'S3', SavedAt: '' },
      ],
    )
    expect(out.teamSets).toHaveLength(1)
    expect(out.teamSets[0].teams).toEqual([
      { name: 'Dragons', members: [{ no: 1, nick: 'S1' }, { no: 2, nick: 'S2' }] },
      { name: 'Team 2', members: [{ no: 3, nick: 'S3' }] },
    ])
  })
})
