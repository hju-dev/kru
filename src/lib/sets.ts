import { unitsFor } from './units'
import type { Level, QuizSet } from '../types'

/**
 * The question sets a game can use, listed BEFORE the game opens (Henry, Nov 24): level -> all the sets -> team builder.
 * The choice travels with the session (setKey, and unit when it comes from a lesson unit); the game starts with it.
 * The keys match the ones the games build themselves (Quiz Island / Point 1-4 decks, the Battle engine sets).
 */
/** One question as the preview shows it (a quiz question, a lesson sentence...). */
export interface PreviewItem {
  q?: string
  text?: string
  choices?: string[]
  answer?: number | string
  tier?: string
  why?: string
  read_aloud?: string
}
/** What the little (i) button shows: the questions of the set, grouped in parts (the sets they come from). */
export interface SetPreview {
  items: PreviewItem[]
  parts?: { name: string; count: number }[]
  /** a sentence about sets that have no list of questions (made by the game) */
  note?: string
}

export interface SetOption {
  key: string
  /** what to show behind the (i) button; absent = nothing to list */
  preview?: SetPreview
  /** a lesson unit this set comes from (also sent to the game) */
  unit?: string
  group: string
  label: string
  sub: string
}

/** Quiz Island and Point 1-4 pick a "deck"; the Battle games pick a "set". Both are listed here. */
export const SET_GAMES = ['quiz-island', 'fortress', 'quiz-battle', 'battle-of-readers', 'battle-of-writers']

const cache = new Map<string, Promise<unknown>>()
function getJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`)
      return r.json() as Promise<T>
    })
    cache.set(url, p)
  }
  return p
}

const prev = (sets: { name?: string; questions?: unknown[] }[]): SetPreview => ({
  items: sets.flatMap((x) => (x.questions ?? []) as PreviewItem[]),
  parts: sets.map((x) => ({ name: x.name ?? 'Questions', count: x.questions?.length ?? 0 })),
})
type WitsContent = Record<string, { sets?: { name?: string; questions?: unknown[] }[] }>
type Unit = { title: string; sets?: { name: string; questions?: unknown[] }[]; scramble?: { text?: string }[] }
const UP: Record<string, string> = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' }
const WRITER_KINDS: [string, string][] = [
  ['scramble', '🔀 Put the words in order'],
  ['build', '✏️ Build a sentence'],
  ['fix', '🔧 Fix the mistake'],
  ['punctuate', '❗ Punctuate it'],
  ['combine', '🔗 Join two sentences'],
  ['describe', '🎨 Describe it'],
]

async function unitsOf(level: Level, slug: string, className: string): Promise<{ id: string; unit: Unit }[]> {
  const out: { id: string; unit: Unit }[] = []
  for (const u of unitsFor(level, slug, className)) {
    try {
      out.push({ id: u.id, unit: await getJson<Unit>(`/units/${u.id}.json`) })
    } catch {
      /* a unit file that fails to load is just left out */
    }
  }
  return out
}

/** The sets for a game and level, or null when the game has no choice of sets. */
export async function loadSets(slug: string, level: Level, className: string, sheet: QuizSet[]): Promise<SetOption[] | null> {
  if (!SET_GAMES.includes(slug)) return null
  const lv = level
  const sheetSets = sheet.filter((s) => s.questions?.length)

  if (slug === 'battle-of-readers') {
    const stories = await getJson<Record<string, unknown[]>>('/games/shared/stories.json')
    const lvl = stories[lv] ? lv : 'M.2'
    const out: SetOption[] = [{ key: 'lv', group: 'Stories', label: `Stories (${lvl})`, sub: `${stories[lvl].length} stories`, preview: { items: [], note: `${stories[lvl].length} short stories at ${lvl} level. Each round the game shows one story, then 5 questions: 2 true/false, 2 questions about the story and 1 find-the-mistake.` } }]
    const up = UP[lvl]
    if (stories[up]) out.push({ key: 'up', group: 'Stories', label: 'Harder stories', sub: `${stories[up].length} stories (the next level up)`, preview: { items: [], note: `${stories[up].length} stories from the next level up: the same 5 question types, with harder reading.` } })
    return out
  }

  if (slug === 'battle-of-writers') {
    const out: SetOption[] = []
    for (const { id, unit } of await unitsOf(lv, slug, className)) {
      if (Array.isArray(unit.scramble) && unit.scramble.some((x) => x && x.text)) {
        const sents = (unit.scramble ?? []).filter((x) => x && x.text).map((x) => ({ text: x.text }))
        out.push({ key: 'u-order', unit: id, group: unit.title, label: '🔀 Put the words in order', sub: 'from your lesson', preview: { items: sents, note: 'The students put the words of each sentence in order. These are the sentences:' } })
        out.push({ key: 'u-punct', unit: id, group: unit.title, label: '❗ Punctuate it', sub: 'from your lesson', preview: { items: sents, note: 'The students add the capital letter and the punctuation to each sentence. These are the sentences:' } })
      }
    }
    out.push({ key: 'mixed', group: 'Built in', label: 'All tasks, mixed', sub: 'a bit of every task', preview: { items: [], note: 'A mix of all six writing tasks: put the words in order, build a sentence, fix the mistake, punctuate it, join two sentences and describe it. Up to 12 of each kind per game.' } })
    for (const [k, name] of WRITER_KINDS) out.push({ key: k, group: 'Built in', label: name, sub: 'one kind of task', preview: { items: [], note: 'Only this kind of writing task, taken from the built-in tasks for the level.' } })
    return out
  }

  // Battle of Wits keeps its sets in its own content; Quiz Island / Point 1-4 also use them as decks
  const wits = await getJson<WitsContent>('/games/quiz-battle/content.json')
  const witsSets = (wits[wits[lv] ? lv : 'M.2']?.sets ?? []).filter((s) => s.questions?.length)
  const witsAll = witsSets.reduce((n, s) => n + (s.questions?.length ?? 0), 0)
  const units = await unitsOf(lv, slug, className)

  if (slug === 'quiz-battle') {
    const out: SetOption[] = []
    for (const { id, unit } of units) {
      const all = (unit.sets ?? []).reduce((n, s) => n + (s.questions?.length ?? 0), 0)
      out.push({ key: 'uall', unit: id, group: unit.title, label: `${unit.title.replace(/^.*Unit \d+[^:]*: /, '')}: all, shuffled`, sub: `${all} questions`, preview: prev(unit.sets ?? []) })
      ;(unit.sets ?? []).forEach((s, i) => out.push({ key: `u:${i}`, unit: id, group: unit.title, label: s.name, sub: `${s.questions?.length ?? 0} questions`, preview: prev([s]) }))
    }
    out.push({ key: 'all', group: 'Built in', label: 'All topics, shuffled', sub: `${witsAll} questions`, preview: prev(witsSets) })
    witsSets.forEach((s, i) => out.push({ key: `b:${i}`, group: 'Built in', label: s.name ?? 'Questions', sub: `${s.questions?.length ?? 0} questions`, preview: prev([s]) }))
    sheetSets.forEach((s, i) => out.push({ key: `s:${i}`, group: 'From your Sheet', label: s.name, sub: `${s.questions.length} questions`, preview: prev([s]) }))
    return out
  }

  // Quiz Island and Point 1-4: decks
  const bankContent = await getJson<{ questions?: Record<string, unknown[]> }>('/games/race-board/content.json')
  const bank = bankContent.questions?.[bankContent.questions[lv] ? lv : 'M.2'] ?? []
  const out: SetOption[] = []
  for (const { id, unit } of units) {
    const all = (unit.sets ?? []).reduce((n, s) => n + (s.questions?.length ?? 0), 0)
    out.push({ key: 'unit', unit: id, group: unit.title, label: `Unit: ${unit.title}`, sub: `${all} questions`, preview: prev(unit.sets ?? []) })
    if ((unit.sets ?? []).length > 1) (unit.sets ?? []).forEach((s) => out.push({ key: `unit:${s.name}`, unit: id, group: unit.title, label: `Unit set: ${s.name}`, sub: `${s.questions?.length ?? 0} questions`, preview: prev([s]) }))
  }
  if (bank.length) out.push({ key: 'bank', group: 'Built in', label: 'Quiz Grand Prix questions', sub: `${bank.length} questions, easy to impossible`, preview: { items: bank as PreviewItem[] } })
  if (witsAll) out.push({ key: 'qb-all', group: 'Built in', label: 'Battle of Wits: all topics', sub: `${witsAll} questions`, preview: prev(witsSets) })
  witsSets.forEach((s) => out.push({ key: `qb:${s.name}`, group: 'Built in', label: `Battle of Wits: ${s.name}`, sub: `${s.questions?.length ?? 0} questions`, preview: prev([s]) }))
  sheetSets.forEach((s) => out.push({ key: `sheet:${s.name}`, group: 'From your Sheet', label: `Your Sheet: ${s.name}`, sub: `${s.questions.length} questions`, preview: prev([s]) }))
  return out
}

/** The whole question list of one lesson unit, for the (i) button on the plain unit list. */
export async function loadUnitPreview(id: string): Promise<SetPreview> {
  const unit = await getJson<Unit>(`/units/${id}.json`)
  return prev(unit.sets ?? [])
}
/** The built-in Quiz Grand Prix (Race Board) bank for a level. */
export async function loadBankPreview(level: string): Promise<SetPreview> {
  const c = await getJson<{ questions?: Record<string, unknown[]> }>('/games/race-board/content.json')
  return { items: (c.questions?.[c.questions[level] ? level : 'M.2'] ?? []) as PreviewItem[] }
}
