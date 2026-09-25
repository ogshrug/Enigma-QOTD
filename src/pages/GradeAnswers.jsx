import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { SkeletonCard } from '../components/Skeleton'
import { isMultiple, partLabel, splitAnswerText } from '../lib/answerParts'
import AnswerText from '../components/AnswerText'
import RichText from '../components/RichText'
import AiFlagButton from '../components/AiFlagButton'

export default function GradeAnswers() {
  const { user } = useAuth()
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [marks, setMarks] = useState({})
  const [notes, setNotes] = useState({})
  const [flags, setFlags] = useState({})

  async function refreshFlags() {
    const { data, error } = await supabase
      .from('ai_flags')
      .select('id, answer_id, note, created_at, flagged_by')
    if (error) {
      // ai_flags may not exist yet if the SQL hasn't been re-run; grading must
      // keep working, so swallow this instead of blocking the whole screen.
      return
    }
    const map = {}
    for (const f of data ?? []) map[f.answer_id] = f
    setFlags(map)
  }

  async function fetchData() {
    const { data, error } = await supabase
      .from('answers')
      .select('*, questions(text, points, answer_parts), profiles!answers_profile_id_fkey(name, class_section)')
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
    await refreshFlags()
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
    if (isMultiple(q))
      return q.answer_parts.reduce((s, p) => s + (Number(p.points) || 0), 0)
    if (Array.isArray(q?.answer_parts) && q.answer_parts.length === 1)
      return Number(q.answer_parts[0].points) || 0
    return q?.points ?? 1
  }

  function marksFor(a) {
    if (marks[a.id]) return marks[a.id]
    const len = a.questions?.answer_parts?.length ?? 0
    return Array(len).fill(false)
  }

  function marksSum(a) {
    return marksFor(a).reduce(
      (s, on, i) => s + (on ? partWorth(a, i) : 0),
      0
    )
  }

  function pointsAfterHints(a) {
    const sum = marksSum(a)
    return sum - 2 * (a.hints_used ?? 0)
  }

  function togglePart(a, i, on) {
    const arr = marksFor(a).slice()
    arr[i] = on
    setMarks((prev) => ({ ...prev, [a.id]: arr }))
  }

  async function submitMulti(a) {
    setBusyId(a.id)
    setError('')
    const points = pointsAfterHints(a)
    const sum = marksSum(a)
    const { error } = await supabase
      .from('answers')
      .update({
        score: sum > 0 ? 1 : 0,
        status: 'graded',
        auto_matched: false,
        points_earned: points,
        review: (notes[a.id] || '').trim(),
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', a.id)
    if (error) setError(error.message)
    await fetchData()
    setBusyId('')
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
        review: (notes[id] || '').trim(),
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) setError(error.message)
    await load()
    setBusyId('')
  }

  async function removePoints(id) {
    if (!window.confirm('Remove the awarded points and send this answer back to review?')) return
    setBusyId(id)
    setError('')
    const { error } = await supabase
      .from('answers')
      .update({
        status: 'pending',
        auto_matched: false,
        points_earned: 0,
        score: 0,
        review: '',
        graded_by: null,
        graded_at: null,
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
    const p = a.profiles
    const pInitials = (p?.name || p?.email || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
    const answeredAt = new Date(a.created_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    return (
      <li key={a.id} className="grade-item">
        <div className="answered-by">
          <span className="aw-avatar" aria-hidden="true">
            {pInitials}
          </span>
          <span className="aw-who">
            <strong>{p?.name || 'Anonymous'}</strong>
            {p?.class_section ? <span className="pill neutral">{p.class_section}</span> : null}
          </span>
          <span className="aw-when muted mono">{answeredAt}</span>
        </div>
        <p>
          <strong><RichText text={a.questions?.text ?? 'Unknown question'} /></strong>
        </p>

        {multi ? (
          <div className="part-grade-list">
            {multi.qParts.map((p, i) => {
              const worth = partWorth(a, i)
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
                  <p className="subtle" style={{ margin: 0, fontSize: 12 }}>
                    Accepts: “{p.text || '—'}”
                  </p>
                  {interactive ? (
                    <div className="row" style={{ margin: '8px 0 0' }}>
                      <button
                        type="button"
                        className={`btn sm ${on ? 'good' : 'ghost'}`}
                        onClick={() => togglePart(a, i, !on)}
                      >
                        {on ? 'Awarded' : 'Award'}
                      </button>
                      <span className="pill neutral">+{worth}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {a.status === 'pending' && (
              <div className="row between" style={{ margin: 0 }}>
                <span className={marksSum(a) > 0 ? 'pill good' : 'pill neutral'}>
                  Earns {pointsAfterHints(a) >= 0 ? `+${pointsAfterHints(a)}` : pointsAfterHints(a)} pts
                  {a.hints_used > 0 ? ` (after ${a.hints_used} hint${a.hints_used > 1 ? 's' : ''})` : ''}
                </span>
                <button
                  type="button"
                  className="btn sm"
                  disabled={busyId === a.id}
                  onClick={() => submitMulti(a)}
                >
                  Save grade
                </button>
              </div>
            )}
          </div>
        ) : (
          <AnswerText text={a.answer_text} className="muted" />
        )}

        {a.status === 'pending' && (
          <div className="review-edit">
            <label htmlFor={`review-${a.id}`}>Review reply (shown to the player)</label>
            <textarea
              id={`review-${a.id}`}
              rows={2}
              placeholder="Optional — explain the grade, max 280 chars"
              maxLength={280}
              value={notes[a.id] || ''}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [a.id]: e.target.value }))
              }
            />
          </div>
        )}
        {a.status === 'graded' && a.review ? (
          <p className="review-note">
            <strong>Review:</strong> {a.review}
          </p>
        ) : null}

        <div className="row between" style={{ marginBottom: 0 }}>
          <span className="muted">
            {a.auto_matched && a.status === 'graded'
              ? 'Auto-graded full marks'
              : a.status === 'graded'
              ? 'Manually graded'
              : 'No match — review'}
          </span>
          <div className="row" style={{ margin: 0 }}>
            <AiFlagButton
              answerId={a.id}
              flag={flags[a.id] || null}
              onChanged={refreshFlags}
            />
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
            {a.status === 'graded' && (
              <>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={busyId === a.id}
                  onClick={() => removePoints(a.id)}
                >
                  Remove points
                </button>
                {a.points_earned > 0 ? (
                  <span className="pill good">
                    +{a.points_earned}/{questionTotal(a.questions)} pts
                  </span>
                ) : a.points_earned < 0 ? (
                  <span className="pill bad">
                    {a.points_earned}/{questionTotal(a.questions)} pts
                  </span>
                ) : (
                  <span className="pill neutral">
                    0/{questionTotal(a.questions)} pts
                  </span>
                )}
              </>
            )}
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