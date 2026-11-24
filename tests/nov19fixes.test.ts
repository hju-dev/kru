import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

// Henry's general fixes (Nov 19, phase 1)
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const title = (slug: string) => (games.find((g) => g.slug === slug) as { title: string }).title

describe('settings gear and team circles', () => {
  it('every game with a settings button shows a gear, not ⋯', () => {
    for (const d of readdirSync(new URL('../public/games', import.meta.url))) {
      let html: string
      try { html = read(`public/games/${d}/index.html`) } catch { continue }
      if (!html.includes('id="more"')) continue
      expect(html, d).toContain('aria-label="Settings"><svg class="gear"')
      expect(html, d).not.toMatch(/id="more"[^>]*>⋯/)
    }
    expect(read('public/games/shared/kru-cards.js')).toContain('aria-label="Settings"><svg class="gear"')
  })
  it('scoreboards show the team number in a colored circle (Kru.badge), not the name', () => {
    const sdk = read('public/sdk/kru.js')
    expect(sdk).toContain("if (t.teacher) return 'T';")
    expect(sdk).toContain('<i class="kteam" style="--kt:')
    for (const f of ['shared/kru-cards.js', 'shared/kru-battle.js', 'think-tank-showdown/app.js', 'hot-seat-vocab/app.js', 'board-race/app.js', 'twenty-questions/app.js', 'tag-team/app.js', 'word-rush/app.js', 'one-word-story/app.js']) {
      expect(read(`public/games/${f}`), f).toContain('Kru.badge(t, ')
    }
  })
  it('team names can no longer be changed on the setup screen', () => {
    const setup = read('src/routes/Setup.tsx')
    expect(setup).not.toContain('setRenaming')
    expect(setup).not.toContain('className="rename"')
  })
})

describe('renames (title only, the ids stay)', () => {
  it('Christmas Dash, Quiz Dash, Battle of Wits, Scattergories', () => {
    expect(title('christmas-race-board')).toBe('Christmas Dash')
    expect(title('race-board')).toBe('Quiz Grand Prix') // was Quiz Dash (Nov 25)
    expect(title('quiz-battle')).toBe('Battle of Wits')
    expect(title('category-grid')).toBe('Scattergories')
    expect(read('public/games/quiz-battle/index.html')).toContain('<title>Battle of Wits</title>')
    expect(read('public/games/category-grid/app.js')).toContain("logo: 'Scatter<b>gories</b>'")
  })
  it('Free answer is now Free Play everywhere', () => {
    for (const f of ['race-board/app.js', 'quiz-island/app.js']) expect(read(`public/games/${f}`), f).toContain("{ id: 'free', label: 'Free Play' }")
    for (const f of ['race-board', 'christmas-race-board', 'quiz-island']) expect(read(`public/games/${f}/content.json`), f).not.toContain('Free answer')
  })
})

describe('Quiz Island fixes', () => {
  const js = read('public/games/quiz-island/app.js')
  const c = JSON.parse(read('public/games/quiz-island/content.json')) as { intro: { title: string; text: string[]; example: { rows?: string[][]; aside?: { title: string; items: string[] } } }[] }
  it('slides use drawn coins, a treasure chest and a pirate for Blackbeard; Pirate Raid has pictures and a side list', () => {
    expect(JSON.stringify(c.intro[0])).toContain('[[coin]]')
    expect(c.intro[2].example.rows![0][0]).toBe('[[chest]] Treasure')
    expect(c.intro[2].example.rows![1][0]).toBe('[[pirate]] Blackbeard & Kidd')
    expect(c.intro[4].example.rows!.map((r) => r[0])).toEqual(['[[boom]] Sink', '[[steal]] Steal', '[[double]] +2 Islands'])
    expect(c.intro[4].example.aside).toEqual({ title: 'Additional power-ups:', items: ['50/50', '+20 s', 'Free Play'] })
    expect(read('public/games/quiz-island/art.js')).toContain('window.KruIntroIcons = { coin: A.coin(), chest: A.chest(), pirate: A.pirate()')
    expect(read('public/games/shared/kru-intro.js')).toContain('window.KruIntroIcons')
  })
  it('fortresses at least 2 islands apart (3 steps), closer only when the map is too small', () => {
    expect(js).toContain('for (var gap = 3; gap >= 1; gap--)')
    expect(js).toContain('m.fort = spreadForts(nf, cells);')
  })
  it('answers are said out loud, never written', () => {
    expect(js).toContain("KruQuiz.shortHint = 'Short answer: say it out loud';")
    expect(JSON.stringify(c)).not.toMatch(/\bwrite\b|written/i)
  })
  it('nautical colors of its own', () => {
    expect(read('public/games/quiz-island/style.css')).toMatch(/nautical colors[\s\S]*--bg: #0a7fc4/)
  })
})

describe('Christmas Dash', () => {
  const c = JSON.parse(read('public/games/christmas-race-board/content.json')) as { questions: { all: { rebus?: string[]; pic?: string }[] } }
  const art = read('public/games/christmas-race-board/xmas-art.js')
  it('every rebus has a drawn picture of its answer, shown on Reveal', () => {
    const rebus = c.questions.all.filter((q) => q.rebus)
    expect(rebus).toHaveLength(22)
    for (const q of rebus) expect(art, q.pic).toContain(`${q.pic}: function`)
    expect(read('public/games/shared/kru-quiz.js')).toContain("var ap = shown && q.pic ? pic(q.pic) : '';")
  })
  it('a drawn Santa with a white beard (in rebus lines too) and a Christmas podium', () => {
    expect(JSON.stringify(c)).not.toContain('🎅')
    expect(JSON.stringify(c)).toContain('[[santa]]')
    const css = read('public/games/christmas-race-board/christmas.css')
    expect(css).toContain('background: var(--santa) center / contain no-repeat;')
    expect(css).toContain('.p1 .kp-who::before')
    expect(read('public/games/christmas-race-board/index.html')).toContain('<script src="xmas-art.js"></script>')
  })
})
