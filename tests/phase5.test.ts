import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { addRecent, RECENT_MAX, toggleFavorite } from '../src/lib/library'

describe('Recently played', () => {
  it('puts the latest game first, with no repeats, at most 6', () => {
    let list: string[] = []
    for (const g of ['a', 'b', 'c', 'a']) list = addRecent(list, g)
    expect(list).toEqual(['a', 'c', 'b'])
    for (const g of ['d', 'e', 'f', 'g', 'h']) list = addRecent(list, g)
    expect(list).toHaveLength(RECENT_MAX)
    expect(list[0]).toBe('h')
    expect(list).not.toContain('b') // the oldest drops off
  })
})

describe('Favorites', () => {
  it('a tap adds, a second tap removes', () => {
    const on = toggleFavorite([], 'quiz-battle')
    expect(on).toEqual(['quiz-battle'])
    expect(toggleFavorite(on, 'quiz-battle')).toEqual([])
    expect(toggleFavorite(['a'], 'b')).toEqual(['a', 'b'])
  })
})

describe('empty and error states', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  it('the app has a friendly error screen instead of a blank page', () => {
    expect(read('src/App.tsx')).toContain('errorElement: <ErrorScreen />')
  })
  it('games and tools say so if they never open (Try again / Back to library)', () => {
    for (const f of ['src/routes/Play.tsx', 'src/routes/Tool.tsx']) {
      const s = read(f)
      expect(s, f).toContain('useFrameReady(reloadKey)')
      expect(s, f).toContain('markReady()')
      expect(s, f).toContain('<FrameStuck')
    }
  })
  it('the update message never covers a game or tool', () => {
    expect(read('src/components/UpdateToast.tsx')).toMatch(/startsWith\('\/play\/'\)[\s\S]*startsWith\('\/tool\/'\)/)
  })
  it('a class with no students says how to add them', () => {
    expect(read('src/routes/Setup.tsx')).toContain('has no active students yet')
  })
})
