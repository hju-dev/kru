import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, callScript, checkScriptUrl, parseReply } from '../src/lib/api'
import { levelFromClass, normalizeBootstrap } from '../src/lib/bootstrap'

describe('checkScriptUrl', () => {
  it('accepts a deployed web app URL and demo', () => {
    expect(checkScriptUrl('https://script.google.com/macros/s/AKfyc123/exec')).toBeNull()
    expect(checkScriptUrl(' https://script.google.com/macros/s/AKfyc123/exec ')).toBeNull()
    expect(checkScriptUrl('demo')).toBeNull()
  })
  it('explains common mistakes', () => {
    expect(checkScriptUrl('hello')).toMatch(/web address/)
    expect(checkScriptUrl('https://script.google.com/macros/s/AKfyc123/dev')).toMatch(/\/dev/)
    expect(checkScriptUrl('https://docs.google.com/spreadsheets/d/x/edit')).toMatch(/script\.google\.com/)
    expect(checkScriptUrl('https://script.google.com/home/projects/x')).toMatch(/\/exec/)
  })
})

describe('parseReply', () => {
  it('returns data when ok', () => {
    expect(parseReply('{"ok":true,"x":1}')).toEqual({ ok: true, x: 1 })
  })
  it('turns Google HTML pages into a clear message', () => {
    expect(() => parseReply('<!DOCTYPE html><html>Sign in</html>')).toThrow(/web page instead of data/)
  })
  it('explains a wrong key', () => {
    try {
      parseReply('{"ok":false,"error":"unauthorised"}')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).kind).toBe('unauthorised')
    }
  })
})

describe('callScript', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('POSTs plain-text JSON with the key in the body, not the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callScript({ url: 'https://script.google.com/macros/s/X/exec', key: ' secret ' }, 'ping')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://script.google.com/macros/s/X/exec')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/)
    expect(init.redirect).toBe('follow')
    expect(JSON.parse(init.body)).toEqual({ action: 'ping', key: 'secret' })
  })

  it('reports a network failure as offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(callScript({ url: 'https://script.google.com/macros/s/X/exec', key: 'k' }, 'ping')).rejects.toMatchObject({
      kind: 'offline',
    })
  })
})

describe('normalizeBootstrap', () => {
  it('works out levels and sorts classes naturally', () => {
    const b = normalizeBootstrap({
      classes: [
        { name: 'M.1/10', order: 1000 },
        { name: 'M.1/9', order: 1000 },
        { name: 'M.3/2', order: 1 },
      ],
      rosters: { 'M.3/2': [{ no: '2', nick: 'S2' }, { no: 1, nick: 'S1', active: false }, { no: 3, nick: '' }] },
      teamSets: [],
    })
    expect(b.classes.map((c) => c.name)).toEqual(['M.3/2', 'M.1/9', 'M.1/10'])
    expect(b.classes[0].level).toBe('M.3')
    expect(b.rosters['M.3/2']).toEqual([
      { no: 1, nick: 'S1', active: false },
      { no: 2, nick: 'S2', active: true },
    ])
  })
  it('rejects an unexpected shape', () => {
    expect(() => normalizeBootstrap({ hello: 1 })).toThrow(/unexpected shape/)
  })
  it('levelFromClass', () => {
    expect(levelFromClass('M.2/3')).toBe('M.2')
    expect(levelFromClass('m3/1')).toBe('M.3')
    expect(levelFromClass('Club')).toBeNull()
    expect(levelFromClass('1/2')).toBe('M.1')
    expect(levelFromClass('3/2P')).toBe('M.3')
    expect(levelFromClass('4/1')).toBeNull()
  })
})
