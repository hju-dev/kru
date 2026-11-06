import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildSubmission, submittedTeams } from '../src/lib/results'
import type { Session } from '../src/lib/session'

// Name Picker plays solo: one "team" per student. Only students given points are saved.
const solo: Session = {
  id: 'np', createdAt: 0, updatedAt: 0, status: 'review', class: 'M.2/1', game: 'name-picker', level: 'M.2', mode: 'solo',
  size: 1, bins: [], absent: [], teacher: false, leaveOut: false,
  teams: [1, 2, 3, 4].map((n) => ({ id: 's' + n, name: 'S' + n, members: [{ no: n, nick: 'S' + n }] })),
  teacherTeam: null,
  log: [], scores: null, notes: '',
}

describe('games that only save students with points ("results": "scored")', () => {
  it('leaves out students with 0 points, ranks the rest', () => {
    const sub = buildSubmission(solo, { s2: 2, s3: 1, s4: 0 }, '', 'Name Picker', new Date(2026, 10, 4, 9, 0), { onlyScored: true })
    expect(sub.rows.map((r) => [r.Nickname, r.Points, r.Rank])).toEqual([
      ['S2', 2, 1],
      ['S3', 1, 2],
    ])
    expect(sub.session.TeamCount).toBe(2)
  })
  it('keeps a negative score (it is not 0)', () => {
    expect(submittedTeams(solo, { s1: -1 }, true).map((t) => t.id)).toEqual(['s1'])
  })
  it('nothing to save when nobody got points', () => {
    expect(buildSubmission(solo, {}, '', 'Name Picker', new Date(), { onlyScored: true }).rows).toEqual([])
  })
  it('other games still save every student', () => {
    expect(buildSubmission(solo, { s2: 2 }, '', 'Scoreboard').rows).toHaveLength(4)
  })
})

describe('Sentence Scramble sentences match HANDOFF word counts', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))
  const c = read('public/games/sentence-scramble/content.json') as Record<string, { sentences: { text: string }[] }>
  const range: Record<string, [number, number]> = { 'M.1': [5, 7], 'M.2': [8, 10], 'M.3': [11, 14] }
  for (const [level, [min, max]] of Object.entries(range)) {
    it(`${level}: ${min}-${max} words, at least 50 sentences, no repeats, each ends with . or ?`, () => {
      const list = c[level].sentences
      expect(list.length).toBeGreaterThanOrEqual(50)
      expect(new Set(list.map((s) => s.text)).size).toBe(list.length)
      for (const s of list) {
        const n = s.text.trim().split(/\s+/).length
        expect(n, s.text).toBeGreaterThanOrEqual(min)
        expect(n, s.text).toBeLessThanOrEqual(max)
        expect(s.text, s.text).toMatch(/[.?]$/)
      }
    })
  }
})

describe('Board Race tasks', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/board-race/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { tasks: { kind: string; title: string; prompt: string; items?: string[]; answers?: string[]; examples?: string }[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: every forms task has one answer per item; every list task has examples`, () => {
      expect(c[level].tasks.length).toBeGreaterThanOrEqual(50)
      for (const t of c[level].tasks) {
        expect(t.title && t.prompt).toBeTruthy()
        if (t.kind === 'forms') expect(t.answers?.length, t.title).toBe(t.items?.length)
        else {
          expect(t.kind).toBe('list')
          expect(t.examples, t.title).toBeTruthy()
        }
      }
    })
  }
})

describe('Hot Seat Vocab words', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/hot-seat-vocab/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { words: { word: string; cat?: string }[]; categories?: string[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: at least 50 words, no repeats`, () => {
      const words = c[level].words.map((w) => w.word.toLowerCase())
      expect(words.length).toBeGreaterThanOrEqual(50)
      expect(new Set(words).size).toBe(words.length)
    })
  }
  it('M.3 words are all Person / Place / Thing / Idea, with at least 10 of each', () => {
    const cats = c['M.3'].categories!
    expect(cats).toEqual(['Person', 'Place', 'Thing', 'Idea'])
    for (const w of c['M.3'].words) expect(cats, w.word).toContain(w.cat)
    for (const cat of cats) expect(c['M.3'].words.filter((w) => w.cat === cat).length).toBeGreaterThanOrEqual(10)
  })
})

describe('Quiz Battle questions', () => {
  it('normalizeQuestions keeps only well-formed Sheet questions', async () => {
    const { normalizeQuestions } = await import('../src/lib/bootstrap')
    expect(normalizeQuestions(undefined)).toEqual([])
    const sets = normalizeQuestions([
      { level: 'M.2', name: 'Unit 3', questions: [
        { q: 'ok mc', choices: ['a', 'b'], answer: 1, double: true },
        { q: 'bad index', choices: ['a', 'b'], answer: 5 },
        { q: 'ok short', answer: 'went' },
        { q: '', answer: 'x' },
      ] },
      { level: 'M.9', name: 'bad level', questions: [{ q: 'x', answer: 'y' }] },
      { level: 'M.1', name: 'empty', questions: [] },
    ])
    expect(sets).toEqual([{ level: 'M.2', name: 'Unit 3', questions: [
      { q: 'ok mc', choices: ['a', 'b'], answer: 1, double: true },
      { q: 'ok short', answer: 'went', double: false },
    ] }])
  })
  it('built-in sets: 5+ sets and 50+ questions per level, valid answers', () => {
    const c = JSON.parse(readFileSync(new URL('../public/games/quiz-battle/content.json', import.meta.url), 'utf8')) as Record<
      string,
      { sets: { name: string; questions: { q: string; choices?: string[]; answer: number | string; double: boolean }[] }[] }
    >
    for (const level of ['M.1', 'M.2', 'M.3']) {
      expect(c[level].sets.length).toBeGreaterThanOrEqual(5)
      expect(c[level].sets.reduce((n, x) => n + x.questions.length, 0)).toBeGreaterThanOrEqual(50)
      for (const s of c[level].sets) {
        expect(s.questions.length, s.name).toBeGreaterThanOrEqual(8)
        for (const q of s.questions) {
          if (q.choices) {
            expect(typeof q.answer, q.q).toBe('number')
            expect(q.answer as number, q.q).toBeLessThan(q.choices.length)
            expect(new Set(q.choices).size, q.q).toBe(q.choices.length)
          } else expect(String(q.answer).length, q.q).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('Think Tank Showdown pools', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/think-tank-showdown/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { rounds: { name: string; kind: string; play: number; spares: number; qs: { q: string; a: string; why: string }[] }[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: 50+ questions, each round's pool is big enough for a fresh draw every game`, () => {
      const rounds = c[level].rounds
      expect(rounds.map((r) => r.kind)).toEqual(['answer', 'answer', 'ideas', 'wager'])
      expect(rounds.reduce((n, r) => n + r.qs.length, 0)).toBeGreaterThanOrEqual(50)
      for (const r of rounds) {
        expect(r.play + r.spares, r.name).toBeLessThan(r.qs.length) // so the next game can differ
        expect(new Set(r.qs.map((q) => q.q)).size, r.name).toBe(r.qs.length)
        for (const q of r.qs) {
          expect(q.q, r.name).toBeTruthy()
          if (r.kind !== 'ideas') expect(q.a, q.q).toBeTruthy()
          else expect(q.why, q.q).toBeTruthy()
        }
      }
    })
  }
})

describe('Word Rush prompts', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/word-rush/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { prompts: { kind: string; prompt: string; examples: string }[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: 50+ prompts, no repeats, every kind used, examples for each`, () => {
      const list = c[level].prompts
      expect(list.length).toBeGreaterThanOrEqual(50)
      expect(new Set(list.map((x) => x.prompt.toLowerCase())).size).toBe(list.length)
      for (const kind of ['cat', 'rhyme', 'letter']) expect(list.some((x) => x.kind === kind), kind).toBe(true)
      for (const x of list) {
        expect(['cat', 'rhyme', 'letter']).toContain(x.kind)
        expect(x.examples.split(',').length, x.prompt).toBeGreaterThanOrEqual(5)
      }
    })
  }
})

describe('Tag-Team topics', () => {
  type Topic = string | { topic: string; ideas: string[] }
  type Level = { mode: string; huddle: number; turn: number; topics: Topic[]; intro?: unknown[] }
  const text = (x: Topic) => (typeof x === 'string' ? x : x.topic)
  const load = (slug: string) => JSON.parse(readFileSync(new URL(`../public/games/${slug}/content.json`, import.meta.url), 'utf8')) as Record<string, Level>
  // two games, one app (games/tag-team/app.js): Talk is relay at every level, Debate is FOR vs AGAINST at every level
  const games = { 'tag-team': 'relay', 'tag-team-debate': 'debate' }
  for (const [slug, mode] of Object.entries(games)) {
    const c = load(slug)
    for (const level of ['M.1', 'M.2', 'M.3']) {
      it(`${slug} ${level}: ${mode}, 50+ topics, no repeats, own slides`, () => {
        expect(c[level].mode).toBe(mode)
        expect(c[level].huddle).toBeGreaterThan(0)
        expect(c[level].turn).toBeGreaterThan(0)
        const t = c[level].topics.map(text)
        expect(t.length).toBeGreaterThanOrEqual(50)
        expect(new Set(t.map((x) => x.toLowerCase())).size).toBe(t.length)
        expect(c[level].intro?.length).toBeGreaterThanOrEqual(2)
      })
    }
  }
  it('debate times grow with the level: M.1 60/20, M.2 75/25, M.3 90/30', () => {
    const c = load('tag-team-debate')
    expect(['M.1', 'M.2', 'M.3'].map((l) => [c[l].huddle, c[l].turn])).toEqual([[60, 20], [75, 25], [90, 30]])
  })
  it('motions are not shared between debate levels', () => {
    const c = load('tag-team-debate')
    const all = ['M.1', 'M.2', 'M.3'].flatMap((l) => c[l].topics.map((x) => text(x).toLowerCase()))
    expect(new Set(all).size).toBe(all.length)
  })
  it('Tag-Team Debate reuses the Tag-Team app and styles', () => {
    const html = readFileSync(new URL('../public/games/tag-team-debate/index.html', import.meta.url), 'utf8')
    expect(html).toContain('<script src="/games/tag-team/app.js"></script>')
    expect(html).toContain('href="/games/tag-team/style.css"')
  })
  it('an old save (no mode) is only restored when its mode matches: old M.3 saves were debates', () => {
    const js = readFileSync(new URL('../public/games/tag-team/app.js', import.meta.url), 'utf8')
    expect(js).toContain("saved.mode || (saved.level === 'M.3' ? 'debate' : 'relay')")
    expect(js).toContain('savedMode === C.mode')
  })
})

describe('Tag-Team Talk: hints, team spinner (Just a Second merged in)', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/tag-team/content.json', import.meta.url), 'utf8'))
  const js = readFileSync(new URL('../public/games/tag-team/app.js', import.meta.url), 'utf8')
  const html = readFileSync(new URL('../public/games/tag-team/index.html', import.meta.url), 'utf8')
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: 100 topics, each with 3 short hints`, () => {
      const t = c[level].topics as { topic: string; ideas: string[] }[]
      expect(t.length).toBeGreaterThanOrEqual(100)
      for (const x of t) {
        expect(typeof x.topic, JSON.stringify(x)).toBe('string')
        expect(x.ideas, x.topic).toHaveLength(3)
        for (const i of x.ideas) expect(i.length, i).toBeLessThanOrEqual(32)
      }
    })
  }
  it('Just a Second topics moved here', () => {
    const all = ['M.1', 'M.2', 'M.3'].flatMap((l) => c[l].topics.map((x: { topic: string }) => x.topic))
    for (const t of ['Pets', 'Social media', 'Should zoos exist?']) expect(all).toContain(t)
  })
  it('hints stay hidden until the teacher taps Hints; a new topic hides them again', () => {
    expect(html).toContain('id="hints"')
    expect(html).toMatch(/id="ideas" hidden/)
    expect(js).toContain('S.hints = false;')
  })
  it('🎯 Pick a team chooses the team at the front (Talk only)', () => {
    expect(html).toContain('/games/shared/kru-picker.js')
    expect(js).toContain("C.mode !== 'debate' && window.KruPicker")
    expect(js).toContain('onPick: function (t) { S.front = t.id;')
  })
  it('no Linking words bonus card', () => {
    expect(JSON.stringify(c.bonus)).not.toMatch(/linking/i)
  })
})

describe('Just a Second was removed (merged into Tag-Team Talk)', () => {
  it('is out of the library, and its old sessions can still be reviewed under its title', async () => {
    const { findGame, gameTitle, RETIRED_GAMES } = await import('../src/lib/games')
    expect(findGame('just-a-minute')).toBeUndefined()
    expect(RETIRED_GAMES['just-a-minute']).toBe('Just a Second')
    expect(gameTitle('just-a-minute')).toBe('Just a Second')
    expect(gameTitle('tag-team')).toBe('Tag-Team Talk')
  })
})

describe('class tools (Name Picker) skip team setup', () => {
  it('quickSession: everyone present plays as themselves, straight into play', async () => {
    const { quickSession } = await import('../src/lib/session')
    const roster = [1, 2, 3, 4].map((n) => ({ id: n, no: n, nick: 'S' + n, active: n !== 4 }))
    const s = quickSession({ name: 'M.1/2', level: 'M.1' }, 'name-picker', roster, [2], new Date(2026, 10, 5, 9, 0))
    expect(s.status).toBe('playing')
    expect(s.mode).toBe('solo')
    expect(s.level).toBe('M.1')
    expect(s.teams.map((t) => t.name)).toEqual(['S1', 'S3']) // absent 2 and inactive 4 left out
    expect(s.teams[0]).toEqual({ id: 's1', name: 'S1', members: [{ no: 1, nick: 'S1' }] })
  })
})

describe('speaking + writing card games (shared card engine)', () => {
  const read = (slug: string) => JSON.parse(readFileSync(new URL(`../public/games/${slug}/content.json`, import.meta.url), 'utf8'))
  const check: Record<string, (it: Record<string, unknown>) => void> = {
    'would-you-rather': (it) => expect(it.a && it.b).toBeTruthy(),
    'sentence-builder': (it) => {
      expect(it.words).toHaveLength(3)
      expect(String(it.example)).toMatch(/^[A-Z].*[.?!]$/)
    },
    'category-grid': (it) => {
      expect(String(it.letter)).toMatch(/^[A-Z]$/)
      const cats = it.cats as { name: string; examples: string[] }[]
      expect(cats).toHaveLength(5)
      for (const c of cats) {
        expect(c.examples.length, c.name).toBeGreaterThan(0)
        for (const w of c.examples) expect(w[0].toUpperCase(), `${c.name}: ${w}`).toBe(it.letter)
      }
    },
  }
  for (const [slug, fn] of Object.entries(check)) {
    const c = read(slug)
    for (const level of ['M.1', 'M.2', 'M.3']) {
      it(`${slug} ${level}: at least 50 cards, no repeats`, () => {
        const items = c[level].items as Record<string, unknown>[]
        expect(items.length).toBeGreaterThanOrEqual(50)
        expect(new Set(items.map((x) => JSON.stringify(x))).size).toBe(items.length)
        for (const it of items) fn(it)
      })
    }
  }
})

describe('reading games: shared story bank', () => {
  type Story = {
    id: string
    title: string
    sentences: string[]
    tf: { s: string; a: boolean; fix?: string }[]
    questions: { q: string; a: string }[]
    mistakes: { i: number; right: string; wrong: string }[]
  }
  const bank = JSON.parse(readFileSync(new URL('../public/games/shared/stories.json', import.meta.url), 'utf8')) as Record<string, Story[]>
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: at least 50 stories, each complete`, () => {
      const list = bank[level]
      expect(list.length).toBeGreaterThanOrEqual(50)
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length)
      expect(new Set(list.map((s) => s.title)).size).toBe(list.length)
      for (const s of list) {
        expect(s.sentences, s.title).toHaveLength(5) // Story Order: A-E
        expect(new Set(s.sentences).size, s.title).toBe(5)
        expect(s.tf, s.title).toHaveLength(4) // True or False Race: four per story
        expect(s.tf.filter((t) => t.a), s.title).toHaveLength(2)
        for (const t of s.tf) if (!t.a) expect(t.fix, `${s.title}: ${t.s}`).toBeTruthy()
        expect(s.questions, s.title).toHaveLength(3) // Read & Remember
        expect(s.mistakes, s.title).toHaveLength(3) // Spot the Mistakes: three, in three different sentences
        expect(new Set(s.mistakes.map((m) => m.i)).size, s.title).toBe(3)
        for (const m of s.mistakes) {
          expect(m.wrong, s.title).not.toBe(m.right)
          const esc = m.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          expect(s.sentences[m.i], `${s.title}: "${m.right}"`).toMatch(new RegExp(`(^|[^\\w'])${esc}(?![\\w])`))
        }
      }
    })
  }
  it('the four story games load the shared bank', () => {
    for (const slug of ['story-order', 'read-remember', 'true-false-race', 'spot-the-mistakes'])
      expect(readFileSync(new URL(`../public/games/${slug}/app.js`, import.meta.url), 'utf8')).toContain("'/games/shared/stories.json'")
  })
})

describe('Scan It! texts', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/scan-it/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { items: { kind: string; head: string; cols: string[]; rows: string[][]; qs: { q: string; a: string }[] }[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: at least 50 texts, 3 questions each, tidy tables`, () => {
      const items = c[level].items
      expect(items.length).toBeGreaterThanOrEqual(50)
      expect(new Set(items.map((x) => x.kind)).size).toBeGreaterThanOrEqual(6)
      for (const it of items) {
        expect(it.qs, it.head).toHaveLength(3)
        for (const q of it.qs) {
          expect(q.a, q.q).toBeTruthy()
          expect(q.q, q.q).not.toMatch(/\.\.|\s\s/)
        }
        for (const r of it.rows) if (it.cols.length) expect(r, it.head).toHaveLength(it.cols.length)
        expect(it.rows.length, it.head).toBeLessThanOrEqual(7) // fits the phone at 18 px
      }
    })
  }
})
