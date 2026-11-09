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
      expect(rounds.map((r) => r.kind)).toEqual(['answer', 'rebus', 'logic', 'wager'])
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
  it('no Linking words bonus card (Talk or Debate); Talk has no bonus cards at all', () => {
    expect(c.bonus).toBeUndefined()
    expect(html).not.toContain('kru-bonus')
    const debate = JSON.parse(readFileSync(new URL('../public/games/tag-team-debate/content.json', import.meta.url), 'utf8'))
    expect(JSON.stringify(debate.bonus)).not.toMatch(/linking/i)
    expect(debate.bonus.before.length).toBeGreaterThanOrEqual(2)
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
  for (const level of ['M.1', 'M.2', 'M.3', 'M.4']) {
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

describe('Tag-Team Talk (Henry, Nov 9)', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/tag-team/content.json', import.meta.url), 'utf8'))
  const js = readFileSync(new URL('../public/games/tag-team/app.js', import.meta.url), 'utf8')
  const html = readFileSync(new URL('../public/games/tag-team/index.html', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../public/games/tag-team/style.css', import.meta.url), 'utf8')
  it('1 minute huddle and 20 s per speaker at every level', () => {
    for (const l of ['M.1', 'M.2', 'M.3']) expect([c[l].huddle, c[l].turn]).toEqual([60, 20])
  })
  it('the clock stops after the huddle (Start talking when ready)', () => {
    expect(js).toContain("if (!debate()) { running = false; clearInterval(timer); phase = 'set';")
    expect(js).toContain("else if (phase === 'huddle' || phase === 'set') startTalk();")
  })
  it('speaking time in the ⋯ menu, 5 s steps, 5 to 120 s', () => {
    expect(html).toContain('id="turnLess"')
    expect(html).toContain('id="turnMore"')
    expect(js).toContain('S.turnSecs = Math.max(5, Math.min(120, turnSecs() + d));')
  })
  for (const l of ['M.1', 'M.2', 'M.3']) {
    it(`${l}: 50 crazy topics with 3 hints, not repeating the normal topics`, () => {
      const crazy = c[l].crazy as { topic: string; ideas: string[] }[]
      expect(crazy.length).toBeGreaterThanOrEqual(50)
      const normal = new Set((c[l].topics as { topic: string }[]).map((t) => t.topic.toLowerCase()))
      for (const t of crazy) {
        expect(t.ideas, t.topic).toHaveLength(3)
        for (const i of t.ideas) expect(i.length, i).toBeLessThanOrEqual(32)
        expect(normal.has(t.topic.toLowerCase()), t.topic).toBe(false)
      }
    })
  }
  it('Crazy topics only toggle', () => {
    expect(html).toContain('id="crazy"')
    expect(js).toContain('S.crazy && C.crazy && C.crazy.length ? C.crazy : C.topics')
  })
  it('challenge rule: 5 seconds of silence (Talk and Debate)', () => {
    const debate = readFileSync(new URL('../public/games/tag-team-debate/content.json', import.meta.url), 'utf8')
    expect(JSON.stringify(c)).toContain('5 seconds of silence')
    expect(JSON.stringify(c)).not.toContain('3-second')
    expect(debate).toContain('5 seconds of silence')
  })
  it('bigger speaker boxes in Talk (easy to tap and drag)', () => {
    expect(css).toMatch(/\.lane\.relay \.slot \{\s*min-height: 46px;/)
  })
})

describe('Category Grid (Henry, Nov 9)', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/category-grid/content.json', import.meta.url), 'utf8'))
  const js = readFileSync(new URL('../public/games/category-grid/app.js', import.meta.url), 'utf8')
  const engine = readFileSync(new URL('../public/games/shared/kru-cards.js', import.meta.url), 'utf8')
  it('no bonus cards; the slides teach "more words, more points" and "no word twice"', () => {
    expect(c.bonus).toBeUndefined()
    const titles = c.intro.map((s: { title: string }) => s.title)
    expect(titles).toContain('More words, more points')
    expect(titles).toContain('No word twice')
    expect(JSON.stringify(c.intro)).toContain('huge heavy horse = 3')
  })
  it('points window: +1 / +3 / +5 / −1 add up, Done ✓ saves the round', () => {
    expect(js).toContain("points: [{ d: 1, label: '+1' }, { d: 3, label: '+3' }, { d: 5, label: '+5' }, { d: -1, label: '−1' }],")
    expect(js).toContain('tally: true')
    expect(engine).toContain("if (sum) { addPoints(panelTeam.id, sum, 'round');")
  })
})

describe('Think Tank Showdown (Henry, Nov 9)', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/think-tank-showdown/content.json', import.meta.url), 'utf8'))
  const js = readFileSync(new URL('../public/games/think-tank-showdown/app.js', import.meta.url), 'utf8')
  const html = readFileSync(new URL('../public/games/think-tank-showdown/index.html', import.meta.url), 'utf8')
  type Q = { q: string; a: string; why: string; show?: string[]; herring?: boolean }
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: round 2 is rebuses, round 3 logic puzzles`, () => {
      const [, rebus, logic] = c[level].rounds as { name: string; qs: Q[] }[]
      expect(rebus.name).toBe('Rebus Round')
      expect(logic.name).toBe('Logic Puzzles')
      for (const q of rebus.qs) {
        expect(q.show?.length, q.q).toBeGreaterThan(0)
        for (const row of q.show!) expect(row === '[line]' || !/\[(?!big:|small:|up:|down:)/.test(row), row).toBe(true)
      }
      for (const q of logic.qs) {
        expect(q.q.split('\n').filter((l) => l.startsWith('• ')).length, q.q).toBeGreaterThanOrEqual(2)
        expect(q.q.trim().endsWith('?'), q.q).toBe(true)
      }
    })
  }
  it('rebuses: a mix of emoji and text layouts', () => {
    const all = ['M.1', 'M.2', 'M.3'].flatMap((l) => c[l].rounds[1].qs as Q[])
    const emoji = all.filter((q) => /\p{Extended_Pictographic}/u.test(q.show!.join('')))
    expect(emoji.length).toBeGreaterThan(15)
    expect(all.length - emoji.length).toBeGreaterThan(15)
  })
  it('red herrings only in M.3: trick questions and a useless clue in every logic puzzle', () => {
    for (const level of ['M.1', 'M.2']) expect(JSON.stringify(c[level].rounds)).not.toContain('"herring"')
    const tricks = (c['M.3'].rounds[0].qs as Q[]).filter((q) => q.herring)
    expect(tricks.length).toBeGreaterThanOrEqual(10)
    for (const q of c['M.3'].rounds[2].qs as Q[]) {
      expect(q.herring, q.q).toBe(true)
      expect(q.why, q.q).toMatch(/Red herring/)
    }
    expect(html).toContain('id="herring"')
  })
  it('Final Wager: any points / ALL IN, bets above the score, mark every team, then add up', () => {
    expect(js).toContain('function maxBet(id) { return Math.max(0, pts(id)); }')
    expect(js).toContain("'ALL IN ' + bet : 'bet ' + bet) + '</span>' : '') +\n        '<span class=\"tp\">'")
    expect(html).toContain('id="betsBack"')
    expect(html).toContain('id="marksBack"')
    expect(js).toContain("$('markApply').disabled = !all;")
    expect(js).toContain("if (bet) addPoints(t.id, S.marks[t.id] === 'right' ? bet : -bet")
  })
})

describe('reading games one level harder (Henry, Nov 10)', () => {
  const bank = JSON.parse(readFileSync(new URL('../public/games/shared/stories.json', import.meta.url), 'utf8'))
  const js = (slug: string) => readFileSync(new URL(`../public/games/${slug}/app.js`, import.meta.url), 'utf8')
  const content = (slug: string) => JSON.parse(readFileSync(new URL(`../public/games/${slug}/content.json`, import.meta.url), 'utf8'))
  it('Read & Remember, Story Order and Spot the Mistakes read one level up; True or False Race does not', () => {
    for (const slug of ['read-remember', 'story-order', 'spot-the-mistakes']) {
      expect(js(slug)).toContain("var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };")
      expect(js(slug)).toContain('return stories[UP[level]] || stories[level];')
    }
    expect(js('true-false-race')).not.toContain('UP[level]')
  })
  it('the stories Read & Remember uses have 3 questions: easy (kept), medium, hard (new)', () => {
    for (const L of ['M.2', 'M.3', 'M.4']) for (const st of bank[L]) expect(st.questions, st.title).toHaveLength(3)
    expect(bank['M.2'][0].questions[2].q).toBe('Why were his shoes soaking wet?')
    expect(JSON.stringify(bank)).not.toContain('Chiang Ruby')
  })
  it('Read & Remember: a reading timer and an answering timer, each −15 / +15', () => {
    expect(js('read-remember')).toContain("adjust: 15, min: 15, max: 300, stepSecs: [60, 60], stepLabels: ['Read', 'Answer']")
  })
  it('Read & Remember: no "Remember the title" card', () => {
    expect(JSON.stringify(content('read-remember').bonus)).not.toMatch(/title/i)
  })
  it('all three: a challenge round every 4th story, double points, and a slide about it', () => {
    for (const slug of ['read-remember', 'story-order', 'spot-the-mistakes']) {
      expect(js(slug)).toMatch(/challengeRound: \{ every: 4,[^}]*double: true/)
      expect(content(slug).intro.map((s: { title: string }) => s.title)).toContain('Challenge round!')
    }
    const engine = readFileSync(new URL('../public/games/shared/kru-cards.js', import.meta.url), 'utf8')
    expect(engine).toContain('function isChal(pos)')
    expect(engine).toContain("'\" data-d=\"' + b.d * x + '\"")
  })
})
