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

describe('Code.gs submitResults helpers', () => {
  const plan = sandbox.planSubmission_ as (r: string[], s: string[], id: string) => { duplicate: boolean; writeResults: boolean }
  const toValues = sandbox.objectsToValues_ as (h: string[], o: object[]) => unknown[][]

  it('writes everything for a new session', () => {
    expect(plan(['a'], ['a'], 'b')).toEqual({ duplicate: false, writeResults: true })
  })
  it('writes nothing when the session was already saved (resend after a timeout)', () => {
    expect(plan(['b', 'b'], ['b'], 'b')).toEqual({ duplicate: true, writeResults: false })
  })
  it('only adds the Sessions row when a previous attempt stopped halfway', () => {
    expect(plan(['b', 'b'], [], 'b')).toEqual({ duplicate: false, writeResults: false })
  })
  it('lines values up with the header order and leaves gaps blank', () => {
    expect(toValues(['SessionID', '', 'Points', 'Deleted'], [{ Points: 0, SessionID: 'x', Extra: 1 }])).toEqual([['x', '', 0, '']])
  })
})

describe('Code.gs buildQuestions_ (Quiz Battle, Questions tab, v6)', () => {
  type Built = { sets: { level: string; name: string; questions: { q: string; choices?: string[]; answer: number | string; double: boolean }[] }[]; problems: { row: number; problem: string }[] }
  const build = sandbox.buildQuestions_ as (rows: object[]) => Built
  const row = (o: object) => ({ Level: 'M.2', Set: 'Unit 3', Question: '', A: '', B: '', C: '', D: '', Answer: '', Double: '', ...o })
  // results come from the vm sandbox, so compare as plain JSON
  const plain = (x: unknown) => JSON.parse(JSON.stringify(x))

  it('multiple choice by letter or by text; short answer when A-D are empty', () => {
    const out = plain(build([
      row({ Question: 'Past of go?', A: 'goed', B: 'went', C: 'gone', Answer: 'b' }),
      row({ Question: 'Opposite of hot?', A: 'warm', B: 'cold', Answer: 'Cold', Double: true }),
      row({ Question: 'Past of eat?', Answer: 'ate' }),
    ]))
    expect(out.problems).toEqual([])
    expect(out.sets).toEqual([{ level: 'M.2', name: 'Unit 3', questions: [
      { q: 'Past of go?', double: false, choices: ['goed', 'went', 'gone'], answer: 1 },
      { q: 'Opposite of hot?', double: true, choices: ['warm', 'cold'], answer: 1 },
      { q: 'Past of eat?', double: false, answer: 'ate' },
    ] }])
  })
  it('groups by level and set name (ignoring capitals); level can be typed loosely', () => {
    const out = plain(build([
      row({ Level: 'm1', Set: 'Food', Question: 'Q1', Answer: 'x' }),
      row({ Level: '1', Set: 'food', Question: 'Q2', Answer: 'y' }),
      row({ Level: 'M.3', Set: '', Question: 'Q3', Answer: 'z' }),
    ]))
    expect(out.sets.map((s: { level: string; name: string; questions: unknown[] }) => [s.level, s.name, s.questions.length])).toEqual([
      ['M.1', 'Food', 2],
      ['M.3', 'My questions', 1],
    ])
  })
  it('skips rows it cannot use and says which Sheet row and why', () => {
    const out = plain(build([
      row({ Question: 'ok', Answer: 'fine' }),
      row({ Level: 'Grade 7', Question: 'bad level', Answer: 'x' }),
      row({ Question: 'no answer' }),
      row({ Question: 'gap', A: 'one', C: 'three', Answer: 'A' }),
      row({ Question: 'letter without choice', A: 'one', B: 'two', Answer: 'D' }),
      row({ Question: 'only A', A: 'one', Answer: 'A' }),
      row({ Question: '' }), // blank question: just skipped, not a problem
    ]))
    expect(out.sets[0].questions).toHaveLength(1)
    expect(out.problems.map((p: { row: number }) => p.row)).toEqual([3, 4, 5, 6, 7])
  })
})

describe('Code.gs v7 Summary tab formulas', () => {
  const formulas = sandbox.summaryFormulas_ as (h: string[]) => { students: string; classes: string } | null
  const colLetter = sandbox.colLetter_ as (n: number) => string
  const RESULTS = ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt']
  it('column letters', () => {
    expect([1, 2, 26, 27, 52].map(colLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AZ'])
  })
  it('student totals: class, no, nickname, total points, games; deleted rows left out', () => {
    const f = formulas(RESULTS)!
    expect(f.students).toBe(
      `=IFERROR(QUERY(Results!A1:P, "select D, I, J, sum(K), count(K) where K is not null and (O is null or O = false) group by D, I, J order by D, I label D 'Class', I 'No', J 'Nickname', sum(K) 'Total points', count(K) 'Games'", 1), "No results yet")`,
    )
    expect(f.classes).toContain('select D, sum(K) where K is not null and (O is null or O = false) group by D')
  })
  it('follows the columns if Henry moved them', () => {
    const moved = ['Nickname', ...RESULTS.filter((h) => h !== 'Nickname')]
    expect(formulas(moved)!.students).toContain('select E, J, A, sum(K)')
  })
  it('no formulas when a needed column is missing', () => {
    expect(formulas(RESULTS.filter((h) => h !== 'Deleted'))).toBeNull()
  })
  it('the script version is 9 (Henry must redeploy)', () => {
    expect(sandbox.KRU_SCRIPT_VERSION).toBe(9)
  })
})

describe('Code.gs v7 ensureSummaryTab_', () => {
  const ensure = sandbox.ensureSummaryTab_ as (ss: unknown) => void
  const RESULTS = ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt']
  function fakeSs(summaryA1: string | null) {
    const cells: Record<string, string> = {}
    if (summaryA1 !== null) cells.A1 = summaryA1
    const summary = {
      cells,
      getRange: (a: string) => ({
        getValue: () => cells[a] ?? '',
        setValue: (v: string) => void (cells[a] = v),
        setFormula: (v: string) => void (cells[a] = v),
        setFontWeight: () => undefined,
      }),
      clear: () => Object.keys(cells).forEach((k) => delete cells[k]),
      setFrozenRows: () => undefined,
    }
    const results = { getLastColumn: () => RESULTS.length, getRange: () => ({ getValues: () => [RESULTS] }) }
    const tabs: Record<string, unknown> = { Results: results }
    if (summaryA1 !== null) tabs.Summary = summary
    return { summary, getSheetByName: (n: string) => tabs[n] ?? null, insertSheet: (n: string) => ((tabs[n] = summary), summary) }
  }
  it('fills a new Summary tab with live formulas', () => {
    const ss = fakeSs(null)
    ensure(ss)
    expect(ss.summary.cells.A1).toMatch(/^Kru Summary/)
    expect(ss.summary.cells.A3).toMatch(/^=IFERROR\(QUERY\(Results!A1:P/)
    expect(ss.summary.cells.H3).toMatch(/^=IFERROR\(QUERY/)
  })
  it('replaces the old placeholder from earlier versions', () => {
    const ss = fakeSs('Student totals will appear here (added in a later Kru update).')
    ensure(ss)
    expect(ss.summary.cells.A3).toMatch(/^=IFERROR/)
  })
  it("never overwrites a Summary tab Henry made himself", () => {
    const ss = fakeSs('My own notes')
    ensure(ss)
    expect(ss.summary.cells).toEqual({ A1: 'My own notes' })
  })
})
