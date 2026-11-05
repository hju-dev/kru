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

describe('Code.gs admin actions (against a fake Sheet)', () => {
  const two = (id: string, date: string, cls = '1/2') => ({
    session: { ...submission.session, id, Date: date, Class: cls },
    rows: submission.rows.map((r) => ({ ...r, Date: date, Class: cls })),
  })

  it('results returns sessions newest first with their rows, and filters', () => {
    post({ action: 'submitResults', ...two('a', '2026-11-01') })
    post({ action: 'submitResults', ...two('b', '2026-11-03', '3/2P') })
    const all = post({ action: 'results' }) as { sessions: { id: string; time: string }[]; rows: { s: string; nick: string; points: number }[] }
    expect(all.sessions.map((s) => s.id)).toEqual(['b', 'a'])
    expect(all.sessions[0].time).toBe('14:05')
    expect(all.rows.filter((r) => r.s === 'a')).toHaveLength(2)
    const one = post({ action: 'results', class: '3/2 p', from: '2026-11-02' }) as { sessions: { id: string }[] }
    expect(one.sessions.map((s) => s.id)).toEqual(['b'])
  })

  it('updateSession gives every team member the new points and rank', () => {
    post({ action: 'submitResults', ...submission })
    expect(post({ action: 'updateSession', sessionId: 's1', teams: [{ team: 'Team 2', points: 20, rank: 1 }], teacherTeamPoints: 4 })).toMatchObject({ ok: true, rowsUpdated: 2 })
    const rows = sheets.Results.objects()
    expect(rows.every((r) => r.Points === 20 && r.EditedAt !== '')).toBe(true)
    expect(sheets.Sessions.objects()[0].TeacherTeamPoints).toBe(4)
  })

  it('deleteSession hides a session from results, and restore brings it back', () => {
    post({ action: 'submitResults', ...submission })
    post({ action: 'deleteSession', sessionId: 's1' })
    expect((post({ action: 'results' }) as { sessions: unknown[] }).sessions).toHaveLength(0)
    expect((post({ action: 'results', includeDeleted: true }) as { sessions: { deleted: boolean }[] }).sessions[0].deleted).toBe(true)
    expect(sheets.Results.objects()).toHaveLength(2) // soft delete: rows still there
    post({ action: 'deleteSession', sessionId: 's1', deleted: false })
    expect((post({ action: 'results' }) as { sessions: unknown[] }).sessions).toHaveLength(1)
  })

  it('saveRoster replaces only that class, matching spaces and capitals', () => {
    sheets.Rosters.getRange(2, 1, 3, 4).setValues([
      ['3/2 P', 1, 'S1', true],
      ['1/2', 1, 'S1', true],
      ['3/2p', 2, 'S2', true],
    ])
    post({ action: 'saveRoster', class: '3/2P', students: [{ no: 1, nick: 'S1', active: true }, { no: 2, nick: 'S2', active: false }, { no: 3, nick: '' }] })
    const rows = sheets.Rosters.objects()
    expect(rows.filter((r) => r.Class === '1/2')).toHaveLength(1)
    expect(rows.filter((r) => r.Class === '3/2P').map((r) => [r.No, r.Active])).toEqual([[1, true], [2, false]])
  })

  it('saveClass adds a class, then updates it', () => {
    expect(post({ action: 'saveClass', class: 'M.1/4', defaultTeamSize: 5 })).toMatchObject({ created: true })
    post({ action: 'saveClass', class: 'm.1/4', archived: true })
    expect(sheets.Classes.objects()).toEqual([{ Class: 'M.1/4', Archived: true, DefaultTeamSize: 5, Order: '' }])
  })

  it('renameClass renames everywhere and refuses a name already in use', () => {
    post({ action: 'submitResults', ...submission })
    post({ action: 'saveRoster', class: '1/2', students: [{ no: 1, nick: 'S1' }] })
    post({ action: 'saveRoster', class: '1/3', students: [{ no: 1, nick: 'S1' }] })
    expect(post({ action: 'renameClass', from: '1/2', to: '1/3' })).toMatchObject({ ok: false, error: 'script-error' })
    expect(post({ action: 'renameClass', from: '1/2', to: 'M.1/2' })).toMatchObject({ ok: true })
    expect(sheets.Results.objects().every((r) => r.Class === 'M.1/2')).toBe(true)
    expect(sheets.Rosters.objects().map((r) => r.Class).sort()).toEqual(['1/3', 'M.1/2'])
  })
})

describe('Code.gs v6 Questions tab', () => {
  it('bootstrap still works on a Sheet with no Questions tab (before Set up tabs)', () => {
    const boot = post({ action: 'bootstrap' }) as { ok: boolean; version: number; questions: unknown[]; questionProblems: unknown[] }
    expect(boot.ok).toBe(true)
    expect(boot.version).toBe(9)
    expect(boot.questions).toEqual([])
    expect(boot.questionProblems).toEqual([])
  })
  it('bootstrap sends the question sets from the Questions tab', () => {
    const q = new FakeSheet('Questions', ['Level', 'Set', 'Question', 'A', 'B', 'C', 'D', 'Answer', 'Double'])
    q.rows.push(['M.1', 'Animals', 'Which one can fly?', 'cat', 'bird', 'fish', '', 'B', true])
    q.rows.push(['M.1', 'Animals', 'Spell the animal: c-a-t', '', '', '', '', 'cat', ''])
    q.rows.push(['M.9', 'Oops', 'bad', '', '', '', '', 'x', ''])
    const sandbox: Record<string, unknown> = { ...fakeGoogle([...Object.values(sheets), q]) }
    runInNewContext(code, sandbox)
    const doPost = sandbox.doPost as (e: object) => { text: string }
    const boot = JSON.parse(doPost({ postData: { contents: JSON.stringify({ key: 'test-key', action: 'bootstrap' }) } }).text)
    expect(boot.questions).toEqual([{ level: 'M.1', name: 'Animals', questions: [
      { q: 'Which one can fly?', double: true, choices: ['cat', 'bird', 'fish'], answer: 1 },
      { q: 'Spell the animal: c-a-t', double: false, answer: 'cat' },
    ] }])
    expect(boot.questionProblems).toEqual([{ row: 4, problem: 'Level must be M.1, M.2 or M.3' }])
  })
})
