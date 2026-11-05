import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeSheet, fakeGoogle } from './fakeSheet'

// Code.gs v9: each student's place in Henry's own list for the class (Rosters → Order), copied onto
// every Results row so he can sort mixed classes (where numbers repeat) and paste grades.
// Placeholder names only (S1…S30): real rosters never go in the repo.
const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')

const RESULTS = ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt', 'Order']
let sheets: Record<string, FakeSheet>
let sb: Record<string, (...a: never[]) => unknown>
let post: (body: object) => Record<string, unknown>

beforeEach(() => {
  sheets = {
    Results: new FakeSheet('Results', RESULTS),
    Sessions: new FakeSheet('Sessions', ['SessionID', 'Date', 'Class', 'Game', 'Level', 'Mode', 'TeamCount', 'TeacherTeamPoints', 'SubmittedAt', 'Deleted', 'EditedAt']),
    Rosters: new FakeSheet('Rosters', ['Class', 'No', 'Nickname', 'Active', 'Order']),
  }
  const sandbox: Record<string, unknown> = { ...fakeGoogle(Object.values(sheets)) }
  runInNewContext(code, sandbox)
  sb = sandbox as typeof sb
  const doPost = sandbox.doPost as (e: object) => { text: string }
  post = (body) => JSON.parse(doPost({ postData: { contents: JSON.stringify({ key: 'test-key', ...body }) } }).text)
})

/** A mixed class: two homerooms, so numbers 3 and 16 appear twice. Listed in Henry's order. */
const MIXED = [[2, 'S2'], [3, 'S3'], [16, 'S16'], [3, 'S23'], [16, 'S26'], [19, 'S19']] as const
function roster(order: (number | '')[] = []) {
  sheets.Rosters.rows.push(...MIXED.map(([no, nick], i) => ['M.2', no, nick, true, order[i] ?? '']))
}
const ss = () => (sb.SpreadsheetApp as unknown as { getActiveSpreadsheet: () => unknown }).getActiveSpreadsheet()

describe('roster order (pure)', () => {
  const orders = (rows: object[]) => (sb.rosterOrders_ as (r: object[]) => { orders: Record<string, Record<string, number>>; missing: number })(rows)
  it('no Order column yet: the order the students are listed in', () => {
    const r = orders(MIXED.map(([no, nick]) => ({ Class: 'M.2', No: no, Nickname: nick })))
    expect(r.orders['M.2']).toEqual({ '2|S2': 1, '3|S3': 2, '16|S16': 3, '3|S23': 4, '16|S26': 5, '19|S19': 6 })
    expect(r.missing).toBe(6)
  })
  it("numbers Henry typed win; blank ones go after the highest so far", () => {
    const r = orders([{ Class: 'M.2', No: 3, Nickname: 'S3', Order: 10 }, { Class: 'm.2', No: 2, Nickname: 'S2' }])
    expect(r.orders['M.2']).toEqual({ '3|S3': 10, '2|S2': 11 })
  })
  it('saving a roster from the app keeps everyone in place', () => {
    const keep = sb.keepOrders_ as (b: Record<string, number>, s: object[]) => number[]
    const before = { '2|S2': 1, '3|S3': 2, '3|S23': 3 }
    // reordered by number in the app, S2 renamed, S3 renamed (but 3 is shared, so it can't be sure), one new
    expect(keep(before, [{ no: 2, nick: 'S21' }, { no: 3, nick: 'S23' }, { no: 3, nick: 'S22' }, { no: 30, nick: 'S30' }])).toEqual([1, 3, 4, 5])
  })
})

describe('roster order in the Sheet', () => {
  it('Set up tabs fills blank Order cells, and gives old results their Order', () => {
    roster()
    sheets.Results.rows.push(['old', '2026-11-01', '09:00', 'M.2', 'Quiz Board', 'M.2', 'group', 'Team 1', 16, 'S26', 4, 1, '', '', '', '', ''])
    ;(sb.fillRosterOrder_ as (s: unknown) => void)(ss())
    ;(sb.fillResultsOrder_ as (s: unknown) => void)(ss())
    expect(sheets.Rosters.objects().map((r) => r.Order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(sheets.Results.objects()[0].Order).toBe(5)
  })
  it('submitResults copies each student’s Order onto their row (a mixed class with repeated numbers)', () => {
    roster([1, 2, 3, 4, 5, 6])
    const row = (no: number, nick: string) => ({ Date: '2026-11-05', Time: '10:00', Class: 'M.2', Game: 'Race Board', Level: 'M.2', Mode: 'group', Team: 'Team 1', No: no, Nickname: nick, Points: 5, Rank: 1, Teammates: '', Notes: '' })
    post({ action: 'submitResults', session: { id: 's9', Date: '2026-11-05', Class: 'M.2', Game: 'Race Board', Level: 'M.2', Mode: 'group', TeamCount: 2, TeacherTeamPoints: 0 }, rows: [row(3, 'S23'), row(3, 'S3'), row(99, 'S99')] })
    expect(sheets.Results.objects().map((r) => [r.Nickname, r.Order])).toEqual([['S23', 4], ['S3', 2], ['S99', '']])
  })
  it('saveRoster from the app keeps the Order column', () => {
    roster([6, 5, 4, 3, 2, 1])
    post({ action: 'saveRoster', class: 'M.2', students: [...MIXED].sort((a, b) => a[0] - b[0]).map(([no, nick]) => ({ no, nick, active: true })) })
    const got = Object.fromEntries(sheets.Rosters.objects().map((r) => [r.Nickname, r.Order]))
    expect(got).toEqual({ S2: 6, S3: 5, S16: 4, S23: 3, S26: 2, S19: 1 })
  })
  it('an older Sheet without an Order column still takes results (before Set up tabs)', () => {
    sheets.Results.rows[0] = RESULTS.slice(0, -1)
    roster()
    const reply = post({ action: 'submitResults', session: { id: 's10', Date: '2026-11-05', Class: 'M.2', Game: 'Scoreboard', Level: 'M.2', Mode: 'group', TeamCount: 1, TeacherTeamPoints: 0 }, rows: [{ Class: 'M.2', No: 2, Nickname: 'S2', Points: 1 }] })
    expect(reply).toMatchObject({ ok: true, rowsWritten: 1 })
  })
})
