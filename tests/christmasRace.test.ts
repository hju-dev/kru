import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

// Christmas Race Board (Henry, Nov 2026): Race Board's rules with a 100-question Christmas bank, 🎄 Challenge squares
// and Forfeit cards. It runs games/race-board/app.js, so the normal game's tests (raceBoardNov9) still apply.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dir = 'public/games/christmas-race-board'
type Q = { tier: string; cat: string; q: string; choices?: string[]; answer: number | string }
const content = JSON.parse(read(`${dir}/content.json`))
const qs = content.questions.all as Q[]
const js = read('public/games/race-board/app.js')

// Henry's answer key, question 1 to 100 (the text of the right option, or the spoken answer)
const KEY = [
  'Mars', '3', 'Honey', 'Pacific Ocean', 'Paris', 'Puppy', 'Giraffe', 'Ice', 'Badminton', '7',
  'Square', 'Egypt', 'Pine tree', 'December 25', 'Apple', 'Pilot', 'Fish', '12', 'Rudolph', 'The Sun',
  'Asia', 'Igloo', 'Piano', 'Earth', 'Stockings', 'Lion', 'Dolphin', 'Sleigh', 'Japan', '8',
  'Saturn', 'Blue whale', 'Paris', 'Carbon dioxide', 'Yen', '11', 'Australia', 'Diamond', 'Eggnog', 'Tinker Bell',
  'Indian Ocean', 'Bangkok', '88', 'Hummingbird', 'Avocado', 'Mercury', 'Boxing Day', 'Mount Everest', 'Heart', '7',
  'France', 'Woody', 'Poinsettia', 'Africa', 'Chameleon', '120', 'An atom', 'Octagon', 'North Pole', 'China',
  'Venus', 'Equator', 'Ebenezer', 'Bat', 'Au', 'Canada', 'Stapes', 'Titanic', 'Gold, frankincense and myrrh', 'Liver',
  'Isaac Newton', 'New York City', 'Hydrogen', 'Metamorphosis', 'The Nutcracker', 'Antarctica', 'Jordan', 'Wellington', 'O negative', 'Palindrome',
  'Santa Claus Is Coming to Town', 'Milky Way', 'Forint', 'Sahara Desert', 'Pacific Ocean',
  'Q', '9 sheep', 'Octopus', 'A towel', '78', '9 zeros', 'Koala', 'Second place', 'Olaf', '2 apples',
  '64', '23', 'Türkiye (Turkey)', '11 seconds', 'Saint Nicholas',
]
const text = (q: Q) => (q.choices ? q.choices[q.answer as number] : String(q.answer))

describe('Christmas bank', () => {
  it('100 questions: 30 easy, 30 regular, 25 hard, 15 impossible, in your order', () => {
    expect(qs).toHaveLength(100)
    const n = (t: string) => qs.filter((q) => q.tier === t).length
    expect([n('easy'), n('regular'), n('hard'), n('impossible')]).toEqual([30, 30, 25, 15])
    expect(qs.map((q) => q.tier).join()).toBe([...Array(30).fill('easy'), ...Array(30).fill('regular'), ...Array(25).fill('hard'), ...Array(15).fill('impossible')].join())
  })
  it("every right answer is the one in Henry's key (even after the options were reshuffled)", () => {
    qs.forEach((q, i) => {
      const t = text(q)
      // spoken answers may carry a short hint after the answer, e.g. "23 (add 1, then 2…)"
      expect(t === KEY[i] || (!q.choices && t.startsWith(KEY[i] + ' ')), `#${i + 1} ${q.q}`).toBe(true)
    })
  })
  it('51 multiple choice (4 options, no repeats) and 49 spoken; no question or answer twice', () => {
    const mc = qs.filter((q) => q.choices)
    expect(mc).toHaveLength(51)
    for (const q of mc) {
      expect(q.choices, q.q).toHaveLength(4)
      expect(new Set(q.choices).size, q.q).toBe(4)
      expect(typeof q.answer).toBe('number')
    }
    for (const q of qs.filter((x) => !x.choices)) expect(String(q.answer).length, q.q).toBeGreaterThan(0)
    expect(new Set(qs.map((q) => q.q)).size).toBe(100)
  })
  it('the right answer is spread over A-D (not nearly always B or C), in every tier too', () => {
    const at = (list: Q[]) => [0, 1, 2, 3].map((i) => list.filter((q) => q.choices && q.answer === i).length)
    const all = at(qs)
    for (const n of all) expect(n).toBeGreaterThan(51 / 6)
    for (const t of ['easy', 'regular', 'hard', 'impossible']) for (const n of at(qs.filter((q) => q.tier === t))) expect(n, t).toBeGreaterThan(0)
  })
  it('numbered options stay in order (piano keys, twelve days, perfect cubes)', () => {
    for (const i of [42, 89, 95]) {
      const nums = qs[i].choices!.map(Number)
      expect([...nums].sort((a, b) => a - b), qs[i].q).toEqual(nums)
    }
  })
  it('math and science questions are tagged for the math-or-science chance card', () => {
    expect(qs.filter((q) => q.cat === 'math' || q.cat === 'science').length).toBeGreaterThanOrEqual(30)
  })
  it('American words, as Henry asked (airplane, color, soccer, movie)', () => {
    const all = JSON.stringify(content)
    expect(all).not.toMatch(/aeroplane|colour|football|\bfilm\b|travelling|Mexican/i)
    expect(qs[15].q).toContain('airplane')
    expect(qs[35].q).toContain('soccer')
  })
})

describe('Christmas cards', () => {
  const { challenge, forfeit, squares } = content.christmas as { challenge: { title: string; text: string }[]; forfeit: { title: string; text: string }[]; squares: number[] }
  it('20 Challenge cards and 20 Forfeit cards, each with a title and a short text', () => {
    for (const deck of [challenge, forfeit]) {
      expect(deck).toHaveLength(20)
      expect(new Set(deck.map((c) => c.title)).size).toBe(20)
      for (const c of deck) {
        expect(c.title.length, c.title).toBeLessThanOrEqual(30)
        expect(c.text.length, c.title).toBeLessThanOrEqual(100)
      }
    }
  })
  it('the 🎄 Challenge squares are plain squares, not START, FINISH or an existing special one', () => {
    const special = [...js.matchAll(/\b(\d+): \{ t: '(?:chance|go|back|again)'/g)].map((m) => +m[1])
    expect(special.length).toBeGreaterThan(10)
    expect(squares.length).toBeGreaterThanOrEqual(4)
    for (const n of squares) {
      expect(n).toBeGreaterThan(2)
      expect(n).toBeLessThan(59)
      expect(special, `square ${n}`).not.toContain(n)
    }
    expect(new Set(squares).size).toBe(squares.length)
  })
})

describe('Christmas Race Board game', () => {
  it('has its own library card: no level choice, no units or Sheet questions', () => {
    const g = games.find((x) => x.slug === 'christmas-race-board') as Record<string, unknown>
    expect(g).toBeTruthy()
    expect(g.levels).toEqual([])
    expect(g.status).toBe('ready')
    expect(g.units).toBeUndefined()
    expect(g.sheetQuestions).toBeUndefined()
  })
  it("loads Race Board's code and styles (like Tag-Team Debate) with its own title", () => {
    const html = read(`${dir}/index.html`)
    expect(html).toContain('<script src="/games/race-board/app.js"></script>')
    expect(html).toContain('href="/games/race-board/style.css"')
    expect(html).toContain('<title>Christmas Race Board</title>')
    expect(read('public/games/race-board/index.html')).toContain('<title>Race Board</title>') // the normal game is untouched
  })
  it('uses your 30 / 30 / 25 / 15 mix, one bank for every level, and a Forfeit instead of the back dice', () => {
    expect(content.shares).toEqual({ easy: 30, regular: 30, hard: 25, impossible: 15 })
    expect(js).toContain('(c.questions.all || c.questions[lv])')
    expect(js).toContain("if (XMAS && !rk) return forfeitOffer(t.id, spec); // Risk it: no forfeit")
    expect(js).toContain("if (what === 'roll') { roll(id, spec); return; }") // refused = the back dice
    expect(js).toContain('S.last = snapshot(); // Undo goes back to this team')
  })
  it('the normal Race Board keeps its own weights and has no Christmas keys', () => {
    expect(js).toMatch(/easy: \{[^}]*share: 30/)
    expect(js).toMatch(/regular: \{[^}]*share: 45/)
    expect(Object.keys(JSON.parse(read('public/games/race-board/content.json')))).not.toContain('christmas')
  })
})
