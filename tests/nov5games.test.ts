import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const json = (p: string) => JSON.parse(read(p))
type Win = Record<string, Record<string, (...a: never[]) => unknown>>
function load(file: string): Win {
  const window: Win = {}
  runInNewContext(read(file), { window, document: {}, navigator: {}, matchMedia: () => ({ matches: true }), setTimeout })
  return window
}

describe('podium: top three scores, ties share a step, teacher never on it', () => {
  type Place = { points: number; teams: { name: string }[] }
  const places = load('public/games/shared/kru-end.js').KruPodium.places as (s: object[]) => Place[]
  const names = (p: Place[]) => p.map((x) => [x.points, x.teams.map((t) => t.name)])
  it('orders 1st, 2nd, 3rd and groups ties', () => {
    const p = places([{ name: 'A', points: 5 }, { name: 'B', points: 9 }, { name: 'C', points: 9 }, { name: 'D', points: 3 }, { name: 'E', points: 1 }])
    expect(names(p)).toEqual([[9, ['B', 'C']], [5, ['A']], [3, ['D']]])
  })
  it('leaves out the teacher and teams with no points', () => {
    const p = places([{ name: 'T. Henry', points: 50, teacher: true }, { name: 'A', points: 2 }, { name: 'B', points: 0 }])
    expect(names(p)).toEqual([[2, ['A']]])
  })
  it('no points at all: no podium (straight to the scores)', () => {
    expect(places([{ name: 'A', points: 0 }])).toEqual([])
  })
  it('every team game with final scores gets it (kru-end.js)', () => {
    for (const g of games.filter((x) => x.status === 'ready')) {
      const html = read(`public/games/${g.slug}/index.html`)
      if (html.includes('/games/shared/kru-end.js')) expect(html, g.slug).toContain('/games/shared/kru-end.css')
    }
  })
})

describe('team picker: nobody twice until everyone has had a turn', () => {
  const next = load('public/games/shared/kru-picker.js').KruPicker.next as (p: string[], all: string[], r?: () => number) => { id: string; picked: string[] }
  it('picks only teams not yet picked, then starts a new round', () => {
    const all = ['t1', 't2', 't3']
    let picked: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = next(picked, all)
      seen.push(r.id)
      picked = r.picked
    }
    expect([...seen].sort()).toEqual(all)
    const again = next(picked, all, () => 0)
    expect(again.picked).toEqual([again.id]) // a new round
  })
  it('forgets teams that are no longer in the game', () => {
    expect(next(['gone', 't1'], ['t1', 't2'], () => 0)).toEqual({ id: 't2', picked: ['t1', 't2'] })
  })
})

describe('Would You Rather: a silly warm-up with no points', () => {
  const c = json('public/games/would-you-rather/content.json')
  it('short choices (40 characters at most) so they fit the phone', () => {
    for (const level of ['M.1', 'M.2', 'M.3']) for (const it of c[level].items) {
      expect(it.a.length, it.a).toBeLessThanOrEqual(40)
      expect(it.b.length, it.b).toBeLessThanOrEqual(40)
    }
  })
  it('no points, a team picker, and only scored students reach the Sheet', () => {
    const js = read('public/games/would-you-rather/app.js')
    expect(js).toContain('noScores: true')
    expect(js).toContain('picker: true')
    expect(js).not.toMatch(/points: \[/) // no point buttons
    expect(games.find((g) => g.slug === 'would-you-rather')).toMatchObject({ results: 'scored' })
    expect(read('public/games/would-you-rather/index.html')).toContain('/games/shared/kru-picker.js')
  })
})

describe('Just a Second (folder just-a-minute)', () => {
  const js = read('public/games/just-a-minute/app.js')
  it('is called Just a Second, keeps its slug so favorites and saves still work', () => {
    expect(games.find((g) => g.slug === 'just-a-minute')!.title).toBe('Just a Second')
    expect(js).toContain("title: 'Just a Second'")
  })
  it('a clock for each student (Tag), adjustable by 10 seconds, and a team picker', () => {
    expect(js).toMatch(/adjust: 10/)
    expect(js).toContain('tag: true')
    expect(js).toContain('picker: true')
  })
})

describe('Word Rush', () => {
  it('has no "Explain it" bonus any more', () => {
    expect(read('public/games/word-rush/app.js')).not.toMatch(/Explain it/i)
  })
})

describe('Dice & Spinner', () => {
  const js = read('public/games/dice-spinner/app.js')
  it('has a coin, and dice with 2 to 20 sides', () => {
    expect(read('public/games/dice-spinner/index.html')).toContain('id="tabCoin"')
    expect(js).toContain('MIN_SIDES = 2, MAX_SIDES = 20')
    expect(js).toContain('Math.random() * S.sides')
  })
})

describe('One-Word Story is a game now', () => {
  const c = json('public/games/one-word-story/content.json')
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: 50+ story openers, no repeats`, () => {
      const list = c[level].openers as string[]
      expect(list.length).toBeGreaterThanOrEqual(50)
      expect(new Set(list.map((x) => x.toLowerCase())).size).toBe(list.length)
    })
  }
  it('whole class, no team setup, nothing written to the Sheet without points', () => {
    expect(games.find((g) => g.slug === 'one-word-story')).toMatchObject({ classTool: true, results: 'scored', status: 'ready' })
  })
  it('the old Talk Timer preset is gone (and removed from saved presets)', () => {
    const t = json('public/games/talk-timer/content.json') as { presets: { id: string }[] }
    expect(t.presets.map((p) => p.id)).not.toContain('one-word-story')
    expect(read('public/games/talk-timer/app.js')).toContain("RETIRED = ['one-word-story']")
  })
})

describe('Quiz Board and Race Board use Quiz Battle questions', () => {
  const qb = json('public/games/quiz-battle/content.json')
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: at least 5 topics with 5+ questions each (a full 5 x 5 board)`, () => {
      const sets = qb[level].sets as { questions: unknown[] }[]
      expect(sets.filter((s) => s.questions.length >= 5).length).toBeGreaterThanOrEqual(5)
    })
  }
  for (const slug of ['quiz-board', 'race-board']) {
    it(`${slug}: loads the shared quiz, podium and How to play`, () => {
      const html = read(`public/games/${slug}/index.html`)
      for (const f of ['kru-quiz.js', 'kru-quiz.css', 'kru-end.js', 'kru-intro.js']) expect(html, f).toContain('/games/shared/' + f)
    })
  }
  it('KruQuiz.html: choices, and the right one only after Reveal', () => {
    const quiz = load('public/games/shared/kru-quiz.js').KruQuiz as { html: (q: object, shown: boolean) => string }
    const q = { q: 'Yesterday I ___ home.', choices: ['go', 'went', 'gone', 'going'], answer: 1 }
    expect(quiz.html(q, false)).not.toContain('right')
    expect(quiz.html(q, true)).toMatch(/kq-choice right"><span class="kq-letter">B/)
    expect(quiz.html({ q: 'Past of swim?', answer: 'swam' }, true)).toContain('swam')
  })
})
