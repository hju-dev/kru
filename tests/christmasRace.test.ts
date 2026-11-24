import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

// Christmas Race Board (Henry, Nov 2026): Race Board's rules with a 200-question Christmas bank, 🎄 Challenge squares
// and Forfeit cards. It runs games/race-board/app.js, so the normal game's tests (raceBoardNov9) still apply.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dir = 'public/games/christmas-race-board'
type Q = { tier: string; cat: string; q: string; choices?: string[]; answer: number | string }
const content = JSON.parse(read(`${dir}/content.json`))
const qs = content.questions.all as Q[]
const js = read('public/games/race-board/app.js')

type Q2 = Q & { id: string; set: string; rebus?: string[] }
const bank = qs as Q2[]

// The answer key printed for Henry (Nov 18), question 1 to 189: the text of the right option, or the spoken answer
const KEY = [
  "Red", "December 25", "Reindeer", "Rudolph", "The North Pole",
  "Stockings", "Ho, ho, ho!", "Elves", "A star", "A carrot",
  "Down the chimney", "Milk and cookies", "Nice", "Snowman", "Mistletoe",
  "J", "Red and white", "Snow", "Wrapping paper", "Olaf",
  "A carol", "A sleigh", "A cookie", "Lights", "December",
  "December 24", "A big sack", "A pine tree", "Cards", "Mrs. Claus",
  "A gingerbread house", "A letter", "Snowman (snow + man)", "Snowball (snow + ball)", "Snow angel (snow + angel)",
  "Snow globe (snow + globe)", "Candy cane (candy + cane)", "Hot chocolate (hot + chocolate)", "Snowstorm (snow + storm)", "A puddle (it melted!)",
  "Neither: they both weigh 1 kilogram", "Snow", "A cold", "Wrapping paper", "An umbrella",
  "A candle", "Friday", "7", "12", "9",
  "7", "12", "6", "Water", "It melts",
  "0 °C", "Your nose", "Electricity", "The Arctic (near the North Pole)", "Rover",
  "1 (a one-horse open sleigh)", "Max", "Green", "A partridge in a pear tree", "Father Christmas",
  "A circle", "Advent", "A little door", "Paris", "New York City",
  "Poinsettia", "Holly", "Milk and eggs", "Germany", "A magic hat",
  "It was foggy", "9", "Turkey", "A piece of wood", "The North Pole",
  "Scrooge", "Ginger", "Coal", "Carolers", "Jingle Bells",
  "Games", "Christmas", "Reindeer (rain + deer)", "Silent Night (silent + night)", "Gift wrap (gift + wrap)",
  "Pine cone (pine + cone)", "Fireplace (fire + place)", "Candlelight (candle + light)", "Rudolph", "2 (the two you took)",
  "It doesn’t: roosters don’t lay eggs", "There is no smoke: it’s an electric train", "A Christmas tree (a pine tree)", "A piano", "He was bald",
  "Second place", "The match", "A stamp", "36", "80",
  "6", "24", "450 baht", "Herbivores", "6",
  "Carbon dioxide", "Oxygen", "Ice is lighter than the same amount of water", "North", "H₂O",
  "Five gold rings", "Ebenezer Scrooge", "Jacob Marley", "Cratchit", "Norway",
  "December 26", "Australia", "Charles Dickens", "Gold, frankincense and myrrh", "Whoville",
  "Two sizes too small", "Tchaikovsky", "Dasher", "Spanish", "French",
  "Türkiye (Turkey)", "Fried chicken", "Coal", "A button", "A Christmas cracker",
  "Maple syrup", "3 (Past, Present and Yet to Come)", "Mistletoe (mist + toe)", "Snowfall (snow + fall)", "Icicle (ice + cycle)",
  "Mitten (mit + ten)", "North Pole (north + fishing pole)", "One: after that, it isn’t empty", "December 28", "Monday (7 days later)",
  "3", "They are a grandfather, a father and a son", "She lives in the south, for example in Australia", "White: the house is at the North Pole, so it’s a polar bear", "T",
  "3 reindeer (12 legs, the elves have 10)", "A secret", "189", "30 km", "30",
  "The blue part", "Water in your breath turns into tiny drops", "CO₂", "Au", "NaCl",
  "Eight maids a-milking", "Eleven pipers piping", "1843", "Montgomery Ward", "McCallister",
  "Donner and Blitzen", "A bishop", "Mexico", "8", "Bedford Falls",
  "Peppermint (pepper + mint, a coin is made at a mint)", "Santa Claus Is Coming to Town", "Rockin’ Around the Christmas Tree (rock + around + tree)", "I’m Dreaming of a White Christmas", "5 minutes",
  "2 kilograms", "December 31 (and today is January 1)", "Push the cork into the bottle", "D (for December: they are the months)", "364",
  "55 km", "8 reindeer (and 12 elves)", "Carbon", "Ag", "Fe",
  "About 300,000 km per second", "32 °F", "Blue", "The leaves",
]
const text = (q: Q) => (q.choices ? q.choices[q.answer as number] : String(q.answer))

describe('Christmas bank (Nov 18: 189 Christmas questions after the rebus audit)', () => {
  it('189 questions: 59 easy, 56 regular, 45 hard, 29 impossible, each with its own id', () => {
    expect(bank).toHaveLength(189)
    const n = (t: string) => bank.filter((q) => q.tier === t).length
    expect([n('easy'), n('regular'), n('hard'), n('impossible')]).toEqual([59, 56, 45, 29])
    expect(new Set(bank.map((q) => q.id)).size).toBe(189)
    expect(new Set(bank.map((q) => q.q + (q.rebus ?? []).join('|'))).size).toBe(189)
  })
  it("your mix: 92 trivia, 22 rebus (11 cut in your audit), 33 brain teasers, 17 reindeer math, 25 Christmas science", () => {
    const n = (s: string) => bank.filter((q) => q.set === s).length
    expect([n('Christmas trivia'), n('Rebus'), n('Brain teaser'), n('Reindeer math'), n('Christmas science')]).toEqual([92, 22, 33, 17, 25])
  })
  it('every right answer matches the printed answer key', () => {
    expect(KEY).toHaveLength(189)
    bank.forEach((q, i) => expect(text(q), `#${i + 1} ${q.q}`).toBe(KEY[i]))
  })
  it('A-D questions have 4 different options; the right answer is spread over A-D', () => {
    const mc = bank.filter((q) => q.choices)
    for (const q of mc) {
      expect(q.choices, q.q).toHaveLength(4)
      expect(new Set(q.choices).size, q.q).toBe(4)
    }
    for (const i of [0, 1, 2, 3]) expect(mc.filter((q) => q.answer === i).length).toBeGreaterThan(mc.length / 6)
  })
  it('rebus puzzles have picture lines and a spoken answer', () => {
    for (const q of bank.filter((x) => x.set === 'Rebus')) {
      expect(q.rebus!.length, q.q).toBeGreaterThan(0)
      expect(q.choices).toBeUndefined()
    }
    expect(read('public/games/shared/kru-quiz.js')).toContain('data-kq="rebus"')
  })
  it('math and science are tagged for the math-or-science chance card', () => {
    expect(bank.filter((q) => q.cat === 'math')).toHaveLength(17)
    expect(bank.filter((q) => q.cat === 'science')).toHaveLength(25)
  })
  it('Christmas only, American words', () => {
    const all = JSON.stringify(content)
    expect(all).not.toMatch(/aeroplane|colour|favourite|football|\bfilm\b|travelling/i)
    for (const q of bank.filter((x) => x.set === 'Christmas trivia')) expect(q.q.length, q.q).toBeLessThanOrEqual(120)
  })
  it('remembers asked questions across games (new ones first, repeats only when all are used)', () => {
    expect(js).toContain('MEMORY = !!XMAS && !QZ.unit')
    expect(js).toContain("Kru.saveKeep({ used: Object.keys(USED) })")
    expect(js).toContain('if (!BANK.some(function (q) { return !USED[q.id]; })) USED = {};')
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
    expect(html).toContain('<title>Christmas Dash</title>')
    expect(read('public/games/race-board/index.html')).toContain('<title>Quiz Grand Prix</title>') // the normal game is untouched
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

describe('Christmas look (Nov 18)', () => {
  const html = read(`${dir}/index.html`)
  const css = read(`${dir}/christmas.css`)
  it('the game links its own Christmas styles, a string of lights and falling snow', () => {
    expect(html).toContain('<link rel="stylesheet" href="christmas.css" />')
    expect(html).toContain('<div class="lights" aria-hidden="true"></div>')
    expect(html).toContain('<div class="snow" aria-hidden="true"></div>')
    expect(html).toContain('🎄 Christmas <b>Dash</b>')
  })
  it('snow never blocks a tap and stops for Reduce Motion', () => {
    expect(css).toMatch(/\.snow \{[^}]*pointer-events: none/)
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.snow::before/)
    expect(read('src/components/Christmas.css')).toMatch(/\.xmas-snow \{[^}]*pointer-events: none/)
  })
  it('Find your team and the Mixed group list use the Christmas look for this game only', () => {
    const g = games.find((x) => x.slug === 'christmas-race-board') as Record<string, unknown>
    expect(g.theme).toBe('christmas')
    expect(games.filter((x) => (x as Record<string, unknown>).theme).length).toBe(1)
    expect(read('src/components/TeamsReveal.tsx')).toContain("findGame(session.game)?.theme === 'christmas'")
    expect(read('src/routes/MixPick.tsx')).toContain("game.theme === 'christmas' ? ' xmas-theme' : ''")
  })
})
