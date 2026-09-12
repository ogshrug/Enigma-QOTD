import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { SkeletonCard } from '../components/Skeleton'
import RichText from '../components/RichText'
import { partLabel } from '../lib/answerParts'
import { todayStr } from './PlayerHome'

function pad(n) {
  return String(n).padStart(2, '0')
}

function dayKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function calendarCells(year, month) {
  const first = new Date(year, month, 1)
  const start = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < start; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

export default function Archive() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [activeDays, setActiveDays] = useState([])
  const [selected, setSelected] = useState('')
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)

  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [year, month]
  )

  const range = useMemo(() => {
    const from = dayKey(year, month, 1)
    const to = dayKey(year, month, new Date(year, month + 1, 0).getDate())
    return { from, to }
  }, [year, month])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSelected('')
    setQuestions(null)
    supabase
      .from('questions')
      .select('question_date')
      .gte('question_date', range.from)
      .lte('question_date', range.to)
      .eq('active', true)
      .then(({ data, error }) => {
        if (cancelled) return
        setActiveDays(data ? [...new Set(data.map((q) => q.question_date))] : [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range.from, range.to])

  const hasQuestions = (key) => activeDays.includes(key)

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setQuestions(null)
    supabase
      .from('questions')
      .select('id, text, question_date, position, keywords, points, answer_parts, hints, explanation')
      .eq('question_date', selected)
      .eq('active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) {
          if (error) return
          data?.length && null
          return
        }
        if (error) {
          setQuestions([])
          return
        }
        setQuestions(data)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  function goMonth(delta) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate())

  return (
    <div>
      <div className="row between">
        <h2 style={{ marginBottom: 0 }}>Question bank</h2>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        Pick a day to revisit that day&rsquo;s questions. Practice — no points
        earned.
      </p>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <button type="button" className="btn ghost sm" onClick={() => goMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong className="cal-month">{monthLabel}</strong>
          <button type="button" className="btn ghost sm" onClick={() => goMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : (
          <>
            <div className="cal-grid" role="grid" aria-label="Calendar">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="cal-head">
                  {d}
                </div>
              ))}
              {calendarCells(year, month).map((date, i) => {
                if (!date) return <div key={`x${i}`} className="cal-day empty" />
                const key = dayKey(year, month, date.getDate())
                const active = hasQuestions(key)
                const isSelected = key === selected
                const isToday = key === todayKey
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'cal-day',
                      active ? 'has-q' : '',
                      isSelected ? 'selected' : '',
                      isToday ? 'today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!active}
                    onClick={() => setSelected(key)}
                    aria-label={`${date.getDate()} — ${active ? 'has questions' : 'no questions'}`}
                  >
                    {date.getDate()}
                    {active && <span className="cal-dot" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            <div className="cal-legend">
              <span>
                <span className="cal-dot lg" aria-hidden="true" /> Day has questions
              </span>
              <span>
                <span className="cal-dot lg today" aria-hidden="true" /> Today
              </span>
            </div>
          </>
        )}
      </div>

      {selected &&
        (questions === null ? (
          <SkeletonCard />
        ) : questions.length === 0 ? (
          <p className="muted">No active questions on this day.</p>
        ) : (
          <div className="card">
            <h3>
              <span className="muted">{selected}</span>
              {' · '}
              {questions.length} question{questions.length > 1 ? 's' : ''}
            </h3>
            <ul className="plain">
              {questions.map((q, i) => (
                <QuestionRow key={q.id} q={q} index={i} />
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}

function QuestionRow({ q, index }) {
  const [revealed, setRevealed] = useState(false)
  const [hintsShown, setHintsShown] = useState(false)
  const isToday = q.question_date === todayStr()
  const total = (q.answer_parts || []).reduce(
    (s, p) => s + (Number(p.points) || 0),
    q.points || 0
  )
  return (
    <li className="grade-item">
      <p style={{ marginTop: 0 }}>
        <strong>
          Q{index + 1} · <RichText text={q.text} />
        </strong>
      </p>
      {isToday ? (
        <p className="subtle" style={{ margin: '0 0 8px' }}>
          This is today&rsquo;s live question — hints and the answer unlock
          tomorrow.
        </p>
      ) : (
        <>
          {q.hints.length > 0 && (
            <div className="row" style={{ margin: '0 0 8px' }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setHintsShown((h) => !h)}
              >
                {hintsShown ? 'Hide hint' : `Reveal hint (${q.hints.length})`}
              </button>
              {hintsShown && (
                <span className="pill warn">{q.hints.join(' · ')}</span>
              )}
            </div>
          )}
          <div className="row">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setRevealed((r) => !r)}
            >
              {revealed ? 'Hide answer' : `Reveal answer (+${total} pts)`}
            </button>
          </div>
        </>
      )}
      {revealed && (
        <div className="part-grade-list" style={{ marginTop: 8 }}>
          {(q.answer_parts.length
            ? q.answer_parts
            : [{ text: q.keywords || [], points: q.points }]
          ).map((p, i) => (
            <div key={i} className="part-grade-card">
              <div className="part-head">
                <span className="part-letter">{partLabel(i)}</span>
                <span className="part-worth">
                  +{Number(p.points) || 0} pts
                </span>
              </div>
              <p style={{ margin: 0 }}>{p.text}</p>
            </div>
          ))}
          {q.explanation && (
            <div className="part-grade-card">
              <div className="part-head">
                <span className="part-letter" style={{ color: 'var(--text-muted)' }}>
                  Why
                </span>
              </div>
              <p style={{ margin: 0 }}>{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}