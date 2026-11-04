import type { Bootstrap, Connection } from '../types'
import { normalizeBootstrap } from './bootstrap'
import { DEMO_URL, demoBootstrap } from './demo'

export type ApiErrorKind = 'offline' | 'timeout' | 'unauthorised' | 'not-json' | 'script' | 'bad-url'

/** An error with a plain-language message Henry can act on. */
export class ApiError extends Error {
  kind: ApiErrorKind
  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const TIMEOUT_MS = 20_000

/** Checks the script URL looks like a deployed Apps Script web app. Returns a problem, or null if OK. */
export function checkScriptUrl(url: string): string | null {
  const u = url.trim()
  if (u === DEMO_URL) return null
  let parsed: URL
  try {
    parsed = new URL(u)
  } catch {
    return 'That doesn’t look like a web address. Paste the whole Web app URL.'
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    return 'The address should start with https://script.google.com/'
  }
  if (parsed.pathname.endsWith('/dev')) {
    return 'This is the test (/dev) address. Use the Web app URL that ends in /exec.'
  }
  if (!parsed.pathname.endsWith('/exec')) return 'The Web app URL should end in /exec.'
  return null
}

/** Turns the raw reply text into data, or a helpful error. Exported for tests. */
export function parseReply(text: string): Record<string, unknown> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    // Google sends an HTML page when access isn't "Anyone", or the URL is wrong
    throw new ApiError(
      'not-json',
      'Google sent back a web page instead of data. Check the URL ends in /exec and “Who has access” is set to Anyone.',
    )
  }
  const d = data as Record<string, unknown>
  if (!d || typeof d !== 'object') throw new ApiError('not-json', 'Empty reply from the Sheet.')
  if (d.ok === true) return d
  if (d.error === 'unauthorised') {
    throw new ApiError('unauthorised', 'The key was not accepted. Check it matches the key in the Sheet (Kru menu → Show my key).')
  }
  if (d.error === 'not-set-up') {
    throw new ApiError('script', 'The Sheet isn’t set up yet. In the Sheet, use Kru menu → Set up tabs.')
  }
  throw new ApiError('script', `The Sheet’s script reported a problem: ${String(d.message || d.error || 'unknown error')}`)
}

/**
 * Sends one request to the Apps Script. Every request is a POST with the JSON as plain text:
 * this avoids the browser's CORS "preflight" (which Apps Script can't answer) and keeps the
 * key out of web addresses.
 */
export async function callScript(conn: Connection, action: string, body: Record<string, unknown> = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', 'No internet connection.')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(conn.url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, action, key: conn.key.trim() }),
      redirect: 'follow',
      signal: ctrl.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError('timeout', 'The Sheet took too long to answer. Try again.')
    throw new ApiError('offline', 'Couldn’t reach Google. Check the internet connection and the URL.')
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 404) throw new ApiError('bad-url', 'Google couldn’t find that script. Check the Web app URL.')
  return parseReply(await res.text())
}

export async function ping(conn: Connection): Promise<void> {
  if (conn.url === DEMO_URL) return
  await callScript(conn, 'ping')
}

export async function fetchBootstrap(conn: Connection): Promise<Bootstrap> {
  if (conn.url === DEMO_URL) return demoBootstrap()
  const reply = await callScript(conn, 'bootstrap')
  return normalizeBootstrap(reply)
}
