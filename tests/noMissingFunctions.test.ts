import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Nov 26: removing SMASH from RedPoint also deleted gotBomb(), so picking "A bomb" froze the game. This test reads every
// game script and fails when the code calls a plain function name that is defined nowhere in that file.
const root = new URL('../public/games/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const files: string[] = []
for (const d of readdirSync(root)) {
  const dir = join(root, d)
  if (!statSync(dir).isDirectory()) continue
  for (const f of readdirSync(dir)) if (f.endsWith('.js')) files.push(join(dir, f))
}
const BUILT = new Set(
  ('if for while switch catch function return typeof parseInt parseFloat isNaN isFinite Number String Boolean Array Object JSON Math Date ' +
    'setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame encodeURIComponent decodeURIComponent fetch ' +
    'Promise Error RegExp Map Set Float32Array Uint8Array MutationObserver ResizeObserver getComputedStyle Event CustomEvent URLSearchParams Symbol structuredClone queueMicrotask matchMedia new delete void in of').split(' '),
)

function strip(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1')
    .replace(/([(,=:!&|?]\s*)\/(?![*/])(?:\\.|\[[^\]\n]*\]|[^/\\\n])+\/[gimsuy]*/g, '$1/re/') // regular expressions
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
}

describe('game scripts never call a function that does not exist', () => {
  it.each(files.map((f) => [f.slice(root.length), f]))('%s', (_name, file) => {
    const s = strip(readFileSync(file, 'utf8'))
    const defs = new Set<string>()
    for (const m of s.matchAll(/function\s+([\w$]+)/g)) defs.add(m[1])
    for (const m of s.matchAll(/(?:var|let|const)\s+([\w$]+)/g)) defs.add(m[1])
    for (const m of s.matchAll(/([\w$]+)\s*=(?!=)/g)) defs.add(m[1])
    for (const m of s.matchAll(/function\s*[\w$]*\s*\(([^)]*)\)/g)) for (const p of m[1].split(',')) defs.add(p.trim())
    for (const m of s.matchAll(/,\s*([\w$]+)\s*(?=[,;=])/g)) defs.add(m[1])
    for (const m of s.matchAll(/([\w$]+)\s*:\s*function/g)) defs.add(m[1])
    const missing = new Set<string>()
    for (const m of s.matchAll(/(^|[^.\w$])([a-zA-Z_$][\w$]*)\s*\(/g)) if (!defs.has(m[2]) && !BUILT.has(m[2])) missing.add(m[2])
    expect([...missing]).toEqual([])
  })
})
