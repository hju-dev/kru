import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeSheet, fakeGoogle } from './fakeSheet'

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')

const TABS = {
  Results: ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt'],
  Sessions: ['SessionID', 'Date', 'Class', 'Game', 'Level', 'Mode', 'TeamCount', 'TeacherTeamPoints', 'SubmittedAt', 'Deleted', 'EditedAt'],
  TeamSets: ['SetID', 'Class', 'Name', 'Team', 'No', 'Nickname', 'SavedAt'],
  Classes: ['Class', 'Archived', 'DefaultTeamSize', 'Order'],
  Rosters: ['Class', 'No', 'Nickname', 'Active'],
}

let sheets: Record<string, FakeSheet>
let post: (body: object) => Record<string, unknown>

beforeEach(() => {
  sheets = Object.fromEntries(Object.entries(TABS).map(([n, h]) => [n, new FakeSheet(n, h)]))
  const sandbox: Record<string, unknown> = { ...fakeGoogle(Object.values(sheets)) }
  runInNewContext(code, sandbox)
  const doPost = sandbox.doPost as (e: object) => { text: string }
  post = (body) => JSON.parse(doPost({ postData: { contents: JSON.stringify({ key: 'test-key', ...body }) } }).text)
})

const submission = {
  session: { id: 's1', Date: '2026-11-04', Class: '1/2', Game: 'Scoreboard', Level: 'M.1', Mode: 'group', TeamCount: 2, TeacherTeamPoints: 9 },
  rows: [
    { Date: '2026-11-04', Time: '14:05', Class: '1/2', Game: 'Scoreboard', Level: 'M.1', Mode: 'group', Team: 'Team 2', No: 7, Nickname: 'Joe', Points: 17, Rank: 1, Teammates: 'S8', Notes: '' },
    { Date: '2026-11-04', Time: '14:05', Class: '1/2', Game: 'Scoreboard', Level: 'M.1', Mode: 'group', Team: 'Team 2', No: 8, Nickname: 'S8', Points: 17, Rank: 1, Teammates: 'Joe', Notes: '' },
  ],
}

describe('Code.gs writes (against a fake Sheet)', () => {
  it('rejects a wrong key', () => {
    expect(post({ action: 'ping', key: 'nope' })).toEqual({ ok: false, error: 'unauthorised' })
  })

  it('submitResults writes one Results row per student and one Sessions row', () => {
    const reply = post({ action: 'submitResults', ...submission })
    expect(reply).toMatchObject({ ok: true, duplicate: false, rowsWritten: 2 })
    const joe = sheets.Results.objects().find((r) => r.No === 7)
    expect(joe).toMatchObject({ SessionID: 's1', Class: '1/2', Team: 'Team 2', Nickname: 'Joe', Points: 17, Rank: 1, Teammates: 'S8' })
    expect(sheets.Sessions.objects()).toHaveLength(1)
    expect(sheets.Sessions.objects()[0]).toMatchObject({ SessionID: 's1', TeamCount: 2, TeacherTeamPoints: 9 })
  })

  it('sending the same session again creates no duplicate rows', () => {
    post({ action: 'submitResults', ...submission })
    const again = post({ action: 'submitResults', ...submission })
    expect(again).toMatchObject({ ok: true, duplicate: true, rowsWritten: 0 })
    expect(sheets.Results.objects()).toHaveLength(2)
    expect(sheets.Sessions.objects()).toHaveLength(1)
  })

  it('grows the sheet when it runs out of rows', () => {
    sheets.Results.maxRows = 2
    expect(post({ action: 'submitResults', ...submission })).toMatchObject({ ok: true })
    expect(sheets.Results.objects()).toHaveLength(2)
  })

  it('saves, replaces and deletes a team set; bootstrap reads it back', () => {
    const set = { id: 'set1', class: '1/2', name: 'Debate teams', teams: [{ name: 'Dragons', members: [{ no: 1, nick: 'S1' }, { no: 2, nick: 'S2' }] }] }
    expect(post({ action: 'saveTeamSet', set })).toMatchObject({ ok: true, id: 'set1' })
    post({ action: 'saveTeamSet', set: { ...set, teams: [{ name: 'Tigers', members: [{ no: 3, nick: 'S3' }] }] } })
    expect(sheets.TeamSets.objects()).toHaveLength(1) // replaced, not added
    const boot = post({ action: 'bootstrap' }) as { teamSets: { name: string; teams: { name: string }[] }[] }
    expect(boot.teamSets[0].teams[0].name).toBe('Tigers')
    expect(post({ action: 'deleteTeamSet', setId: 'set1' })).toMatchObject({ ok: true, removed: 1 })
    expect(sheets.TeamSets.objects()).toHaveLength(0)
  })

  it('deleting one set leaves the others alone', () => {
    const mk = (id: string, n: number) => ({ id, class: '1/2', name: id, teams: [{ name: 'A', members: Array.from({ length: n }, (_, i) => ({ no: i + 1, nick: `S${i + 1}` })) }] })
    post({ action: 'saveTeamSet', set: mk('a', 2) })
    post({ action: 'saveTeamSet', set: mk('b', 3) })
    post({ action: 'saveTeamSet', set: mk('c', 1) })
    post({ action: 'deleteTeamSet', setId: 'b' })
    expect(sheets.TeamSets.objects().map((r) => r.SetID)).toEqual(['a', 'a', 'c'])
  })
})
