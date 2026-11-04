import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('vercel.json', () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

  it('sends app routes to index.html but leaves files, games and the SDK alone', () => {
    const re = new RegExp(`^${cfg.rewrites[0].source}$`)
    expect(re.test('/')).toBe(true)
    expect(re.test('/admin/settings')).toBe(true)
    expect(re.test('/assets/index.js')).toBe(false)
    expect(re.test('/games/word-rush/')).toBe(false)
    expect(re.test('/sdk/kru.js')).toBe(false)
  })

  it('allows same-origin game frames and Google Apps Script calls', () => {
    const headers = cfg.headers[0].headers as { key: string; value: string }[]
    const csp = headers.find((h) => h.key === 'Content-Security-Policy')!.value
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain('https://script.google.com')
    expect(csp).toContain('https://script.googleusercontent.com')
    expect(headers.find((h) => h.key === 'X-Frame-Options')!.value).toBe('SAMEORIGIN')
  })
})

describe('microphone (Noise light tool)', () => {
  it('only Kru itself may use the microphone, and the tool frame is allowed to ask', () => {
    const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] }
    const pp = cfg.headers.flatMap((h) => h.headers).find((h) => h.key === 'Permissions-Policy')?.value ?? ''
    expect(pp).toContain('microphone=(self)')
    expect(pp).toContain('camera=()')
    expect(readFileSync(new URL('../src/routes/Tool.tsx', import.meta.url), 'utf8')).toContain('allow="screen-wake-lock; microphone"')
  })
})
