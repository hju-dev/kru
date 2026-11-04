#!/usr/bin/env node
/**
 * Privacy check: stops student data, keys and private URLs from being committed.
 *
 *   npm run check:privacy            check every file git would see
 *   node scripts/check-privacy.mjs --staged   check only what's about to be committed (used by the git hook)
 *
 * Optional: put real student nicknames, one per line, in .privacy-denylist.txt (that file is
 * git-ignored and must never be committed). Any of those names appearing in the repo fails the check.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const staged = process.argv.includes('--staged')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const files = (
  staged
    ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
    : git('ls-files', '--cached', '--others', '--exclude-standard')
)
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)

const readLines = (path) =>
  existsSync(path)
    ? readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : []

const denylist = readLines('.privacy-denylist.txt')
const allowlist = new Set(readLines('scripts/privacy-allowlist.txt').map((s) => s.toLowerCase()))

// Placeholder names that are always fine in code and demo data ("S" covers code like 'S' + number)
const isPlaceholder = (name) => /^(S\d{0,2}|Student \d{1,2}|T\. ?Henry|Team \d+)$/i.test(name) || allowlist.has(name.toLowerCase())

const BLOCKED_FILES = [
  [/(^|\/)\.env(\.|$)/, 'environment file (may hold secrets)'],
  [/\.(csv|xlsx|xls|ods|tsv)$/i, 'spreadsheet export (may hold rosters or results)'],
  [/(^|\/)\.privacy-denylist\.txt$/, 'the local list of real student names'],
  [/\.zip$/i, 'zip archive (contents can’t be checked)'],
]
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp3|wav|ogg|pdf)$/i

const findings = []
const report = (file, line, why, text) => findings.push({ file, line, why, text: text.trim().slice(0, 120) })

for (const file of files) {
  const blocked = BLOCKED_FILES.find(([re]) => re.test(file))
  if (blocked) {
    report(file, 0, blocked[1], '')
    continue
  }
  if (BINARY.test(file) || file.startsWith('node_modules/')) continue

  let content
  try {
    content = staged ? git('show', `:${file}`) : readFileSync(file, 'utf8')
  } catch {
    continue // deleted or unreadable
  }
  if (file === 'scripts/privacy-allowlist.txt') continue

  const lines = content.split(/\r?\n/)
  lines.forEach((text, i) => {
    const n = i + 1
    // A real deployed script or Sheet ID (long random string), not a "…" or "X" placeholder
    if (/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/.test(text)) report(file, n, 'real Apps Script URL', text)
    if (/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{20,}/.test(text)) report(file, n, 'real Google Sheet URL', text)
    // A Kru secret key (format made by Code.gs newKey_)
    for (const m of text.matchAll(/\b[a-z2-9]{5}(?:-[a-z2-9]{5}){3}\b/g)) {
      if (!allowlist.has(m[0])) report(file, n, 'looks like a Kru secret key', text)
    }
    // Roster-shaped data: a nick/nickname field holding a name that is not a placeholder like S12
    for (const m of text.matchAll(/["']?nick(?:name)?["']?\s*:\s*["']([^"'$`{}]+)["']/gi)) {
      if (!isPlaceholder(m[1].trim())) report(file, n, `student-style nickname "${m[1]}"`, text)
    }
    // Pasted roster rows: "12<TAB>Name"
    if (/^\s*\d{1,2}\t[^\t\d][^\t]*$/.test(text)) report(file, n, 'pasted roster row (number, tab, name)', text)
    // Real names from the local denylist
    for (const name of denylist) {
      const re = new RegExp(`(^|[^\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu')
      if (re.test(text)) report(file, n, `real student name from .privacy-denylist.txt`, text.replace(new RegExp(name, 'gi'), '█'.repeat(name.length)))
    }
  })
}

if (findings.length) {
  console.error(`\n✋ Privacy check FAILED: ${findings.length} problem(s). Nothing was committed.\n`)
  for (const f of findings) console.error(`  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.why}${f.text ? `\n      ${f.text}` : ''}`)
  console.error('\nRemove the data (rosters belong only in the Google Sheet), or if it is a placeholder,')
  console.error('add it to scripts/privacy-allowlist.txt.\n')
  process.exit(1)
}
console.log(
  `✓ Privacy check passed (${files.length} ${staged ? 'staged ' : ''}files${denylist.length ? `, ${denylist.length} names from the denylist` : ', no local denylist'}).`,
)
