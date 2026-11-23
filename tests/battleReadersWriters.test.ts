import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'
import { gameTitle, findGame } from '../src/lib/games'
import { unitsFor } from '../src/lib/units'

// Battle of Readers + Battle of Writers (Henry, Nov 19): the Battle engine with stories / writing tasks.
// They replace Reading Island, Sentence Builder and Sentence Scramble Race.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const engine = read('public/games/shared/kru-battle.js')

describe('the old games are retired, the new ones are in the library', () => {
  it('Reading Island, Sentence Builder and Sentence Scramble Race are gone; old sessions keep their names', () => {
    for (const [slug, title] of [['reading-island', 'Reading Island'], ['sentence-builder', 'Sentence Builder'], ['sentence-scramble', 'Sentence Scramble Race']]) {
      expect(findGame(slug), slug).toBeUndefined()
      expect(existsSync(new URL(`../public/games/${slug}`, import.meta.url)), slug).toBe(false)
      expect(gameTitle(slug)).toBe(title)
    }
  })
  it('Battle of Readers (Reading) and Battle of Writers (Writing, with lesson packs)', () => {
    expect(games.find((g) => g.slug === 'battle-of-readers')).toMatchObject({ title: 'Battle of Readers', section: 'reading', status: 'ready', modes: ['group'] })
    expect(games.find((g) => g.slug === 'battle-of-writers')).toMatchObject({ title: 'Battle of Writers', section: 'writing', status: 'ready', units: true })
    expect(unitsFor('M.3', 'battle-of-writers', 'M.3/2').map((u) => u.id)).toEqual(['m3-u8-l1'])
    for (const g of ['battle-of-readers', 'battle-of-writers']) expect(read(`public/games/${g}/index.html`), g).toContain('/games/shared/kru-battle.js')
  })
})

describe('Battle of Readers', () => {
  const js = read('public/games/battle-of-readers/app.js')
  it('one story per round: read it first (45-120 s), then 5 questions; 📖 Story shows it again', () => {
    expect(engine).toContain("if (reading()) { S.phase = 'read'; startClock(S.readSecs || 60); render(); tone([523, 659], 0.1); return; }")
    expect(engine).toContain("KruMenu.timer($('readRow'), S.readSecs || 60,") // Time to read the story
    expect(engine).toContain('data-do="peek"')
    expect(js).toContain('return { read: { title: st.title, sentences: st.sentences }, questions: pick(qs, qs.length, rand) };')
  })
  it('2 true or false, 2 questions, 1 find-the-mistake per story; the same picks after a reload', () => {
    expect(js).toContain("pick(st.tf || [], 2, rand)")
    expect(js).toContain("pick(st.questions || [], 2, rand)")
    expect(js).toContain("q: 'Find the mistake. Write the correct word.'")
    expect(js).toContain("var rand = seeded(String(session.id || '') + level);")
  })
  it('stories at the level, and harder ones from the next level', () => {
    expect(js).toContain("var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };")
  })
  it('the score strip hides while reading so even the longest story fits', () => {
    expect(read('public/games/shared/kru-battle.css')).toContain('.kbt.ph-read .strip { display: none; }')
  })
})

describe('Battle of Writers', () => {
  const js = read('public/games/battle-of-writers/app.js')
  const c = JSON.parse(read('public/games/battle-of-writers/content.json'))
  it('six kinds of writing task', () => {
    for (const k of ['scramble:', 'build:', 'fix:', 'punctuate:', 'combine:', 'describe:']) expect(js).toContain(k)
  })
  it('content per level: 50 build, 50 scramble (from the old games), 12 join, 10 describe', () => {
    for (const lv of ['M.1', 'M.2', 'M.3']) {
      expect(c[lv].build.length, lv).toBeGreaterThanOrEqual(50)
      expect(c[lv].scramble.length, lv).toBeGreaterThanOrEqual(50)
      expect(c[lv].combine).toHaveLength(12)
      expect(c[lv].describe).toHaveLength(10)
      for (const j of c[lv].combine) expect(j.answer, j.a).toMatch(/^[A-Z].*[.?]$/)
    }
  })
  it('a lesson pack’s scramble sentences become unit sets', () => {
    expect(js).toContain("sets.push({ key: 'u-order', group: unit.title, name: '🔀 Put the words in order'")
  })
  it('scrambled words hide the first capital and the end mark; punctuation tasks strip them', () => {
    expect(js).toContain("var words = text.replace(/[.!?]+$/, '').split(/\\s+/);")
    expect(js).toContain("return text.toLowerCase().replace(/[.,!?;:'’\"]/g, '')")
  })
  it('slides: 5, short, about writing', () => {
    expect(c.intro.map((s: { title: string }) => s.title)).toEqual(['Battle of Writers', 'Be quick!', 'Write a whole sentence', 'Check together', 'Count your points'])
  })
})
