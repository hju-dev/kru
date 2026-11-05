import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Code.gs v8: one tab per class ("1/2", "M.3", …) with live formulas over Results.
const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const sandbox: Record<string, unknown> = {}
runInNewContext(code, sandbox)

const RESULTS = ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt']
type Formulas = { students: string; games: string }
const formulas = sandbox.classTabFormulas_ as (h: string[], cls: string) => Formulas | null
const tabName = sandbox.classTabName_ as (cls: string) => string | null

/** A tiny spreadsheet: tabs hold either table rows (Results, Classes, Rosters) or A1 cells (class tabs). */
function fakeSs(tables: Record<string, string[][]>, extra: Record<string, Record<string, string>> = {}) {
  type Tab = ReturnType<typeof makeTab>
  const tabs: Tab[] = []
  function makeTab(name: string, rows: string[][] = [], cells: Record<string, string> = {}) {
    const tab = {
      name,
      rows,
      cells,
      frozen: 0,
      getName: () => tab.name,
      setName: (n: string) => void (tab.name = n),
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
      getRange: (a: string | number, c?: number, nr = 1, nc = 1) =>
        typeof a === 'string'
          ? {
              getValue: () => cells[a] ?? '',
              setValue: (v: string) => void (cells[a] = v),
              setFormula: (v: string) => void (cells[a] = v),
              setFontWeight: () => undefined,
            }
          : { getValues: () => rows.slice(a - 1, a - 1 + nr).map((r) => r.slice(c! - 1, c! - 1 + nc)) },
      clear: () => Object.keys(cells).forEach((k) => delete cells[k]),
      setFrozenRows: (n: number) => void (tab.frozen = n),
    }
    return tab
  }
  for (const [name, rows] of Object.entries(tables)) tabs.push(makeTab(name, rows))
  for (const [name, cells] of Object.entries(extra)) tabs.push(makeTab(name, [], cells))
  const ss = {
    tabs,
    getSheetByName: (n: string) => tabs.find((t) => t.name === n) ?? null,
    getSheets: () => tabs.slice(),
    getNumSheets: () => tabs.length,
    insertSheet: (n: string, at: number) => {
      const t = makeTab(n)
      tabs.splice(at, 0, t)
      return t
    },
    getSpreadsheetLocale: () => 'en_US',
    getSpreadsheetTimeZone: () => 'Asia/Bangkok',
  }
  return ss
}

describe('Code.gs v8 class tab formulas', () => {
  it('student totals for one class: No, Nickname, Total points, Games; deleted rows left out', () => {
    const f = formulas(RESULTS, '1/2')!
    expect(f.students).toBe(
      `=IFERROR(QUERY(FILTER(Results!A2:P, SUBSTITUTE(UPPER(Results!D2:D), " ", "") = "1/2", Results!K2:K <> "", Results!O2:O <> TRUE), ` +
        `"select Col9, Col10, sum(Col11), count(Col11) group by Col9, Col10 order by Col9 label Col9 'No', Col10 'Nickname', sum(Col11) 'Total points', count(Col11) 'Games'", 0), "No results yet")`,
    )
  })
  it("the class's games, newest first", () => {
    const f = formulas(RESULTS, '1/2')!
    expect(f.games).toContain('select Col2, Col5, Col6, Col8, Col9, Col10, Col11, Col12 order by Col2 desc, Col3 desc')
    expect(f.games).toContain("label Col2 'Date', Col5 'Game', Col6 'Level', Col8 'Team', Col9 'No', Col10 'Nickname', Col11 'Points', Col12 'Rank'")
  })
  it('matches the class like the app does: spaces and capitals ignored', () => {
    expect(formulas(RESULTS, '3/2 p')!.students).toContain('" ", "") = "3/2P"')
    expect(formulas(RESULTS, 'm.3')!.students).toContain('= "M.3"')
  })
  it('follows the columns if Henry moved them', () => {
    const moved = ['Nickname', ...RESULTS.filter((h) => h !== 'Nickname')]
    const f = formulas(moved, 'M.2')!.students
    expect(f).toContain('UPPER(Results!E2:E)') // Class moved from D to E
    expect(f).toContain('select Col10, Col1, sum(Col11)') // No moved to 10, Nickname is now 1
  })
  it('no formulas when a needed column is missing', () => {
    expect(formulas(RESULTS.filter((h) => h !== 'Points'), '1/2')).toBeNull()
  })
  it('tab names: the class name, but never a Kru tab name', () => {
    expect(['1/2', '3/2P', ' M.3 '].map(tabName)).toEqual(['1/2', '3/2P', 'M.3'])
    expect(['Results', 'summary', 'Rosters', '', 'x'.repeat(101)].map(tabName)).toEqual([null, null, null, null, null])
  })
  it('the script version is 8 (Henry must redeploy)', () => {
    expect(sandbox.KRU_SCRIPT_VERSION).toBe(8)
  })
})

describe('Code.gs v8 class tabs in the Sheet', () => {
  const ensureAll = sandbox.ensureClassTabs_ as (ss: unknown) => void
  const ensureOne = sandbox.ensureClassTab_ as (ss: unknown, cls: string, onlyIfMissing: boolean) => boolean
  const rename = sandbox.renameClassTab_ as (ss: unknown, from: string, to: string) => void
  const henrysClasses = ['1/2', '1/3', '2/2', '2/3', 'M.2', '3/2', '3/3', '3/2P', '3/3P', 'M.3']
  const classesTab = () => [['Class', 'Archived', 'DefaultTeamSize', 'Order'], ...henrysClasses.map((c, i) => [c, '', '', String(i + 1)])]

  it('Set up tabs: one tab per class, in class order, after the other tabs', () => {
    const ss = fakeSs({ Results: [RESULTS], Classes: classesTab(), Rosters: [['Class', 'No', 'Nickname', 'Active']] })
    ensureAll(ss)
    expect(ss.tabs.map((t) => t.name)).toEqual(['Results', 'Classes', 'Rosters', ...henrysClasses])
    const t = ss.getSheetByName('3/2P')!
    expect(t.cells.A1).toMatch(/^Kru class tab: 3\/2P\./)
    expect(t.cells.A3).toMatch(/^=IFERROR\(QUERY\(FILTER\(Results!A2:P/)
    expect(t.cells.G3).toContain('"3/2P"')
    expect(t.frozen).toBe(3)
  })
  it('archived classes get no new tab; a class only in Rosters does', () => {
    const classes = [['Class', 'Archived'], ['1/2', ''], ['Old', 'TRUE']]
    const rosters = [['Class', 'No', 'Nickname', 'Active'], ['2/3', '1', 'S1', 'TRUE']]
    const ss = fakeSs({ Results: [RESULTS], Classes: classes, Rosters: rosters })
    ensureAll(ss)
    expect(ss.tabs.map((t) => t.name)).toEqual(['Results', 'Classes', 'Rosters', '1/2', '2/3'])
  })
  it("running Set up tabs again refreshes Kru's tabs but never one Henry made himself", () => {
    const ss = fakeSs({ Results: [RESULTS], Classes: [['Class'], ['1/2'], ['1/3']] }, { '1/2': { A1: 'Kru class tab: 1/2. old text' }, '1/3': { A1: 'My own notes' } })
    ensureAll(ss)
    expect(ss.getSheetByName('1/2')!.cells.A3).toMatch(/^=IFERROR/)
    expect(ss.getSheetByName('1/3')!.cells).toEqual({ A1: 'My own notes' })
    expect(ss.tabs.filter((t) => t.name === '1/2')).toHaveLength(1)
  })
  it('first results for a new class: its tab is made; an existing tab is left as it is', () => {
    const ss = fakeSs({ Results: [RESULTS] }, { '1/2': { A1: 'Kru class tab: 1/2. keep me' } })
    expect(ensureOne(ss, 'M.2', true)).toBe(true)
    expect(ss.getSheetByName('M.2')!.cells.A3).toMatch(/^=IFERROR/)
    expect(ensureOne(ss, '1/2', true)).toBe(false)
    expect(ss.getSheetByName('1/2')!.cells).toEqual({ A1: 'Kru class tab: 1/2. keep me' })
  })
  it('renaming a class renames its tab and its formulas', () => {
    const ss = fakeSs({ Results: [RESULTS], Classes: [['Class'], ['3/2P']] })
    ensureAll(ss)
    rename(ss, '3/2 p', '3/2 Plus')
    expect(ss.getSheetByName('3/2P')).toBeNull()
    expect(ss.getSheetByName('3/2 Plus')!.cells.A3).toContain('= "3/2PLUS"')
  })
  it('submitting results still works when the Sheet cannot make tabs', async () => {
    // tryClassTab_ swallows errors: a tab problem must never lose a lesson's scores
    const tryTab = sandbox.tryClassTab_ as (ss: unknown, cls: string) => void
    expect(() => tryTab({ getSheetByName: () => { throw new Error('boom') } }, '1/2')).not.toThrow()
  })
})
