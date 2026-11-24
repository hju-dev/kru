import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The (i) button on the question-set screen (Henry, Nov 25): a summary, then every question.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const sets = read('src/lib/sets.ts')
const screen = read('src/routes/Sets.tsx')
const sheet = read('src/components/SetPreviewSheet.tsx')

describe('question set preview', () => {
  it('every kind of set that has questions carries a preview (units, built-in sets, decks, the Sheet, the Quiz Grand Prix bank)', () => {
    expect((sets.match(/preview: prev\(/g) ?? []).length).toBeGreaterThanOrEqual(10)
    expect(sets).toContain("label: 'Quiz Grand Prix questions'")
    expect(sets).toContain('export async function loadUnitPreview(id: string)')
    expect(sets).toContain('export async function loadBankPreview(level: string)')
  })
  it('sets the game makes up (stories, writing tasks) get a short description instead of a list', () => {
    expect(sets).toContain('A mix of all six writing tasks')
    expect(sets).toContain('Each round the game shows one story')
  })
  it('the screen shows an (i) button on the right of every set and on the plain unit list', () => {
    expect(screen).toContain('className="set-info"')
    expect(screen).toContain('<SetPreviewSheet')
    expect(screen).toContain("loadUnitPreview(u.id)")
  })
  it('the pop-up has a summary (formats, difficulty, what it covers) and the full list with the right answers marked', () => {
    for (const s of ['Formats', 'Difficulty', 'What it covers', 'All the questions', 'Multiple choice (A to D)', 'True or false', 'Short answer']) expect(sheet, s).toContain(s)
    expect(sheet).toContain("' ✓'")
  })
})
