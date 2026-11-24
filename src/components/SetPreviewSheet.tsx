import { useEffect, useState } from 'react'
import type { PreviewItem, SetPreview } from '../lib/sets'
import { Sheet } from './Sheet'
import './SetPreviewSheet.css'

const isTF = (i: PreviewItem) => Array.isArray(i.choices) && i.choices.length === 2 && i.choices.every((c) => /^(true|false)$/i.test(String(c)))

/** The short summary: what formats the questions come in and what they cover (for Henry's glance before a game). */
export function summarize(p: SetPreview) {
  const items = p.items
  const quiz = items.filter((i) => i.q)
  const tf = quiz.filter(isTF).length
  const mc = quiz.filter((i) => Array.isArray(i.choices) && !isTF(i)).length
  const sa = quiz.length - tf - mc
  const sentences = items.filter((i) => !i.q && i.text).length
  const formats: string[] = []
  if (mc) formats.push(`Multiple choice (A to D): ${mc}`)
  if (tf) formats.push(`True or false: ${tf}`)
  if (sa) formats.push(`Short answer (say it or write it): ${sa}`)
  if (sentences) formats.push(`Sentences: ${sentences}`)
  const order = ['easy', 'regular', 'hard', 'impossible']
  const tiers = order.map((t) => [t, items.filter((i) => i.tier === t).length] as const).filter(([, n]) => n > 0)
  const cats = new Map<string, number>()
  for (const i of items as (PreviewItem & { cat?: string })[]) if (i.cat) cats.set(i.cat, (cats.get(i.cat) ?? 0) + 1)
  return { total: items.length, formats, tiers, cats: [...cats.entries()], hasWhy: items.some((i) => i.why) }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Row({ n, item }: { n: number; item: PreviewItem }) {
  const text = item.q ?? item.text ?? ''
  const correct = typeof item.answer === 'number' && item.choices ? item.choices[item.answer] : undefined
  return (
    <li className="pv-q">
      <div className="pv-qtext">
        <span className="pv-n">{n}</span>
        <span>{text}</span>
        {item.tier && <span className={`pv-tier ${item.tier}`}>{cap(item.tier)}</span>}
      </div>
      {item.choices && (
        <ol className="pv-choices" type="A">
          {item.choices.map((c, i) => (
            <li key={i} className={typeof item.answer === 'number' && i === item.answer ? 'right' : ''}>
              {c}
              {typeof item.answer === 'number' && i === item.answer ? ' ✓' : ''}
            </li>
          ))}
        </ol>
      )}
      {!item.choices && item.q && item.answer != null && item.answer !== '' && <div className="pv-ans">Answer: {String(item.answer)}</div>}
      {correct === undefined && item.choices && typeof item.answer === 'string' && <div className="pv-ans">Answer: {item.answer}</div>}
      {item.why && <div className="pv-why">{item.why}</div>}
    </li>
  )
}

/** The (i) pop-up on the question-set screen: a summary first, then every question. */
export function SetPreviewSheet({ title, source, onClose }: { title: string; source: SetPreview | (() => Promise<SetPreview>); onClose: () => void }) {
  const [data, setData] = useState<SetPreview | null>(typeof source === 'function' ? null : source)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (typeof source !== 'function') return
    let off = false
    source().then((d) => !off && setData(d)).catch(() => !off && setFailed(true))
    return () => {
      off = true
    }
  }, [source])

  const parts = data?.parts && data.parts.length > 1 ? data.parts : null
  const sum = data ? summarize(data) : null
  // the questions in order, cut into the sets they come from (numbering continues across the sets)
  const sections = (() => {
    if (!data) return []
    const list = parts ?? [{ name: '', count: data.items.length }]
    const out: { name: string; items: PreviewItem[]; offset: number }[] = []
    let at = 0
    for (const p of list) {
      out.push({ name: p.name, items: data.items.slice(at, at + p.count), offset: at })
      at += p.count
    }
    return out
  })()
  return (
    <Sheet title={title} onClose={onClose}>
      {failed && <p className="muted">Could not load the questions.</p>}
      {!data && !failed && <p className="muted">Loading…</p>}
      {data && sum && (
        <div className="pv">
          <section className="pv-sum" aria-label="Summary">
            <p className="pv-total">
              <b>{sum.total}</b> {sum.total === 1 ? 'question' : 'questions'}
            </p>
            {data.note && <p className="muted">{data.note}</p>}
            {sum.formats.length > 0 && (
              <>
                <h3>Formats</h3>
                <ul>{sum.formats.map((f) => <li key={f}>{f}</li>)}</ul>
              </>
            )}
            {sum.tiers.length > 0 && (
              <>
                <h3>Difficulty</h3>
                <p>{sum.tiers.map(([t, c]) => `${cap(t)} ${c}`).join(' · ')}</p>
              </>
            )}
            {sum.cats.length > 0 && (
              <>
                <h3>Subjects</h3>
                <p>{sum.cats.map(([c, k]) => `${cap(c)} ${k}`).join(' · ')}</p>
              </>
            )}
            {parts && (
              <>
                <h3>What it covers</h3>
                <ul>{parts.map((p) => <li key={p.name}>{p.name} <span className="muted">({p.count})</span></li>)}</ul>
              </>
            )}
            {sum.hasWhy && <p className="muted small">Each answer has a one-line explanation. The right answers are marked ✓ below.</p>}
          </section>
          {data.items.length > 0 && (
            <section aria-label="All the questions">
              <h3>All the questions</h3>
              {sections.map((sec) => (
                <div key={sec.name || 'all'}>
                  {parts && <h4 className="pv-part">{sec.name}</h4>}
                  <ul className="pv-list">
                    {sec.items.map((it, i) => (
                      <Row key={sec.offset + i} n={sec.offset + i + 1} item={it} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </Sheet>
  )
}
