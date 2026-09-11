import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { SkeletonCard } from '../components/Skeleton'
import { isMultiple, partLabel, splitAnswerText } from '../lib/answerParts'

export default function GradeAnswers() {
  const { user } = useAuth()
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [marks, setMarks] = useState({})

  async function fetchData() {
    const { data, error } = await supabase
      .from('answers')
      .select('*, questions(text, points, answer_parts)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setAnswers(data ?? [])
      setError('')
    }
  }

  async function load() {
    setLoading(true)
    await fetchData()
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const pending = useMemo(
    () => answers.filter((a) => a.status === 'pending'),
    [answers]
  )
  const graded = useMemo(
    () => answers.filter((a) => a.status === 'graded'),
    [answers]
  )

  function partWorth(a, i) {
    return Math.max(0, Number(a.questions?.answer_parts?.[i]?.points) || 0)
  }

  function questionTotal(q) {
    if (isMultiple(q)) return q.answer_parts.reduce((s, p) => s + (Number(p.points) || 0), 0)
    if (Array.isArray(q?.answer_parts) && q.answer_parts.length === 1)
      return Number(q.answer_parts[0].points) || 0
    return q?.points ?? 1
  }

  function marksFor(a) {
    const arr = marks[a.id]
    if (arr) return arr
    return (a.questions?.answer_parts ?? []).map(() => false)
  }

  function markedSum(a) {
    return marksFor(a).reduce(
      (s, on, i) => s + (on ? partWorth(a, i) : 0),
      0
    )
  }

  function gradedPoints(a) {
    const sums = markedSum(a)
    return sums - 2 * (a.hints_used ?? 0)
  }

  async function togglePart(a, i, on) {
    const qParts = a.questions?.answer_parts ?? []
    const arr = marksFor(a).slice()
    if (arr[i] === on) return
    arr[i] = on
    setMarks((m) => ({ ...m, [a.id]: arr }))
    setBusyId(a.id)
    setError('')
    const sum = arr.reduce((s, onVal, idx) => s + (onVal ? partWorth(a, idx) : 0), 0)
    const points = sum - 2 * (a.hints_used ?? 0)
    const { error } = await supabase
      .from('answers')
      .update({
        score: sum > 0 ? 1 : 0,
        status: 'graded',
        auto_matched: false,
        points_earned: points,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', a.id)
    if (error) setError(error.message)
    setBusyId('')
    await fetchData()
  }

  async function gradeSingle(id, correct, answerRow) {
    setBusyId(id)
    setError('')
    const base = correct ? questionTotal(answerRow.questions) : 0
    const hints = answerRow.hints_used ?? 0
    const points = base - 2 * hints
    const { error } = await supabase
      .from('answers')
      .update({
        score: correct ? 1 : 0,
        status: 'graded',
        auto_matched: false,
        points_earned: points,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) setError(error.message)
    await load()
    setBusyId('')
  }

  function multipleParts(a) {
    if (!isMultiple(a.questions)) return null
    const qParts = a.questions.answer_parts
    const segs = splitAnswerText(a.answer_text)
    return { qParts, segs }
  }

  function answerRow(a) {
    const multi = multipleParts(a)
    return (
      <li key={a.id} className="grade-item">
        <p>
          <strong>{a.questions?.text ?? 'Unknown question'}</strong>
        </p>

        {multi ? (
          <div className="part-grade-list">
            {multi.qParts.map((p, i) => {
              const worth = Math.max(0, Number(p.points) || 0)
              const on = marksFor(a)[i]
              const interactive = a.status === 'pending'
              return (
                <div key={i} className="part-grade-card">
                  <div className="part-head">
                    <span className="part-letter">{partLabel(i)}</span>
                    <span className="part-worth">+{worth} pts</span>
                  </div>
                  <p className="muted" style={{ margin: '0 0 2px', fontSize: 13 }}>
                    You answered:
                  </p>
                  <p style={{ margin: '0 0 8px' }}>{multi.segs[i] || '—'}</p>
                  <p className="subtle" style={{ margin: '0 0 8px', fontSize: 12 }}>
                    Accepts: “{p.text || '—'}”
                  </p>
                  {interactive ? (
                    <div className="row" style={{ margin: 0 }}>
                      <button
                        className={`btn sm ${on ? 'good' : 'ghost'}`}
                        disabled={busyId === a.id}
                        onClick={() => togglePart(a, i, !on)}
                      >
                        {on ? 'Awarded' : `Award`}
                      </button>
                      <span className="pill neutral">+{worth}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {a.status === 'pending' && (
              <div className="grade-summary">
                <span className={gradedPoints(a) > 0 ? 'pill good' : 'pill neutral'}>
                  Earns {gradedPoints(a) >= 0 ? `+${gradedPoints(a)}` : gradedPoints(a)} pts
                  {a.hints_used > 0 ? ` (after ${a.hints_used} hint${a.hints_used > 1 ? 's' : ''})` : ''}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">{a.answer_text}</p>
        )}

        <div className="row between" style={{ marginBottom: 0 }}>
          <span className="muted">
            {a.auto_matched && a.status === 'graded'
              ? 'Auto-graded full marks'
              : a.status === 'graded'
              ? 'Manually graded'
              : 'No match — review'}
          </span>
          <div className="row" style={{ margin: 0 }}>
            {a.hints_used > 0 && (
              <span className="pill warn" title="Revealed before submitting">
                {a.hints_used} hint{a.hints_used > 1 ? 's' : ''}
              </span>
            )}
            {!multi &&
              a.status === 'pending' &&
              (() => {
                const total = questionTotal(a.questions)
                return (
                  <>
                    <button
                      className="btn good sm"
                      disabled={busyId === a.id}
                      onClick={() => gradeSingle(a.id, true, a)}
                    >
                      {`Full (+${Math.max(0, total - 2 * (a.hints_used ?? 0))})`}
                    </button>
                    <button
                      className="btn bad sm"
                      disabled={busyId === a.id}
                      onClick={() => gradeSingle(a.id, false, a)}
                    >
                      Wrong
                    </button>
                  </>
                )
              })()}
            {a.status === 'graded' &&
              (a.points_earned > 0 ? (
                <span className="pill good">
                  +{a.points_earned}/{questionTotal(a.questions)} pts
                </span>
              ) : a.points_earned < 0 ? (
                <span className="pill bad">{a.points_earned}/{questionTotal(a.questions)} pts</span>
              ) : (
                <span className="pill neutral">0/{questionTotal(a.questions)} pts</span>
              ))}
          </div>
        </div>
      </li>
    )
  }

  if (loading)
    return (
      <div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )

  return (
    <div>
      <div className="row between">
        <h2>Grade answers</h2>
        <button className="btn ghost" onClick={load}>
          Refresh
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Needs review ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="muted">Nothing waiting — all answers got a keyword match.</p>
        ) : (
          <ul className="plain">{pending.map((a) => answerRow(a))}</ul>
        )}
      </div>

      <div className="card">
        <h3>Auto-graded ({graded.length})</h3>
        {graded.length === 0 ? (
          <p className="muted">No graded answers yet.</p>
        ) : (
          <ul className="plain">{graded.map((a) => answerRow(a))}</ul>
        )}
      </div>
    </div>
  )
}