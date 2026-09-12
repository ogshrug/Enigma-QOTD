import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import Countdown from '../components/Countdown'
import { SkeletonCard, SkeletonKpis } from '../components/Skeleton'
import { MULTI_DELIM, isMultiple, partLabel, splitAnswerText } from '../lib/answerParts'
import RichText from '../components/RichText'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function dayBefore(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`
}

function computeStreak(dateStrs) {
  const set = new Set(dateStrs.filter(Boolean))
  let streak = 0
  let d = todayStr()
  if (!set.has(d)) d = dayBefore(d)
  while (set.has(d)) {
    streak += 1
    d = dayBefore(d)
  }
  return streak
}

export default function PlayerHome() {
  const { user, profile } = useAuth()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [allAnswers, setAllAnswers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [shownHints, setShownHints] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refreshTimer = useRef(null)
  const today = todayStr()

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />

  const seasonPoints = useMemo(
    () =>
      allAnswers.reduce((sum, a) => sum + (a.status === 'graded' ? Number(a.points_earned) || 0 : 0), 0),
    [allAnswers]
  )
  const streak = useMemo(
    () => computeStreak(allAnswers.map((a) => a.questions?.question_date)),
    [allAnswers]
  )

  const loadAnswers = async (qids) => {
    if (!qids.length) return
    const { data } = await supabase
      .from('answers')
      .select('*')
      .eq('profile_id', user.id)
      .in('question_id', qids)
    if (data) {
      setAnswers((prev) => {
        const next = { ...prev }
        for (const a of data) next[a.question_id] = a
        return next
      })
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('question_date', today)
        .eq('active', true)
        .order('position', { ascending: true })
      if (cancelled) return
      const qs = data ?? []
      setQuestions(qs)
      await loadAnswers(qs.map((q) => q.id))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [today, user.id])

  useEffect(() => {
    let cancelled = false
    if (user.id) {
      supabase
        .from('answers')
        .select('*, questions(question_date)')
        .eq('profile_id', user.id)
        .then(({ data }) => {
          if (!cancelled) setAllAnswers(data ?? [])
        })
    }
    return () => {
      cancelled = true
    }
  }, [user.id])

  useEffect(() => {
    if (questions.length && refreshTimer.current === null) {
      refreshTimer.current = setInterval(() => {
        loadAnswers(questions.map((q) => q.id))
      }, 10000)
    }
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [questions])

  function qTotal(q) {
    if (isMultiple(q))
      return q.answer_parts.reduce((s, p) => s + (Number(p.points) || 0), 0)
    return q.answer_parts?.[0]?.points ?? q.points ?? 1
  }

  function hintCount(qid) {
    let count = 0
    for (const key of Object.keys(shownHints))
      if (key.startsWith(qid + ':') && shownHints[key]) count++
    return count
  }

  function toggleHint(qid, i) {
    const key = `${qid}:${i}`
    setShownHints((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function setDraft(qid, i, text) {
    setDrafts((prev) => {
      const arr = Array.isArray(prev[qid]) ? [...prev[qid]] : []
      arr[i] = text
      return { ...prev, [qid]: arr }
    })
  }

  function draftText(qid, i) {
    const d = drafts[qid]
    return (Array.isArray(d) ? d[i] : '') ?? ''
  }

  function isDraftFilled(q) {
    if (isMultiple(q))
      return q.answer_parts.some((_, i) => draftText(q.id, i).trim() !== '')
    return draftText(q.id, 0).trim() !== ''
  }

  async function handleSubmit(e, q) {
    e.preventDefault()
    const text = isMultiple(q)
      ? q.answer_parts.map((_, i) => draftText(q.id, i).trim()).join(MULTI_DELIM).trim()
      : draftText(q.id, 0).trim()
    if (!text) return
    setSubmitting(q.id)
    setError('')
    const { data, error: insErr } = await supabase
      .from('answers')
      .insert({
        question_id: q.id,
        profile_id: user.id,
        answer_text: text,
        hints_used: hintCount(q.id),
      })
      .select()
      .maybeSingle()
    if (insErr) {
      setError(insErr.message)
      setSubmitting(null)
      return
    }
    setAnswers((prev) => ({ ...prev, [q.id]: data }))
    setAllAnswers((prev) =>
      prev.some((a) => a.question_id === q.id)
        ? prev.map((a) => (a.question_id === q.id ? data : a))
        : [data, ...prev]
    )
    setDrafts((prev) => ({
      ...prev,
      [q.id]: isMultiple(q) ? q.answer_parts.map(() => '') : [''],
    }))
    setSubmitting(null)
  }

  function scorePill(a) {
    if (!a) return null
    if (a.status === 'pending') return <span className="pill warn">Under review</span>
    const pts = a.points_earned ?? 0
    if (pts > 0) return <span className="pill good">+{pts} pt{pts === 1 ? '' : 's'}</span>
    if (pts === 0) return <span className="pill neutral">0 pts</span>
    return <span className="pill bad">{pts} pts</span>
  }

  function Breakdown({ a }) {
    const pts = a.points_earned ?? 0
    const base = pts + (a.hints_used ?? 0) * 2
    return (
      <div className="points-breakdown">
        <span className="row-line">
          <span className="muted">Base</span>
          <span>+{base}</span>
        </span>
        {a.hints_used > 0 && (
          <span className="row-line">
            <span className="muted">
              {a.hints_used} hint{a.hints_used > 1 ? 's' : ''} (−2 each)
            </span>
            <span className="bad-num">−{a.hints_used * 2}</span>
          </span>
        )}
        <span className="row-line strong-line">
          <span>Net</span>
          <span>{pts > 0 ? `+${pts}` : pts}</span>
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <SkeletonKpis />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div>
      <div className="row" style={{ marginTop: 0 }}>
        <div className="metric-card reset">
          <p className="metric-label">Next question</p>
          <p className="metric-value" style={{ marginBottom: 4 }}>
            <Countdown label="Resets" />
          </p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Daily question changes at midnight
          </p>
        </div>
        <div className="metric-card streak">
          <p className="metric-label">Streak</p>
          <p className="metric-value">
            {streak} day{streak === 1 ? '' : 's'}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {streak === 0 ? 'Play today to start one' : 'Keep it alive today'}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Season points</p>
          <p className="metric-value">{seasonPoints > 0 ? `+${seasonPoints}` : seasonPoints}</p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Graded answers only
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {questions.length === 0 ? (
        <div className="card center">
          <h1>No question yet today</h1>
          <p className="muted">
            The club hasn’t posted a question for {today}. The next one resets at
            midnight — check back soon!
          </p>
        </div>
      ) : (
        questions.map((q, idx) => {
          const total = qTotal(q)
          const a = answers[q.id]
          const hintsShown = Array.isArray(q.hints) && q.hints.length > 0
          const hc = hintCount(q.id)

          return (
            <div key={q.id} className="card">
              <div className="row between">
                <h2 style={{ margin: 0 }}>
                  {questions.length > 1 && (
                    <span className="pill info" style={{ marginRight: 8 }}>
                      {idx + 1}/{questions.length}
                    </span>
                  )}
                  {questions.length === 1 ? "Today's question" : `Question ${idx + 1}`}
                </h2>
                <span className="pill neutral">worth {total} pt{total === 1 ? '' : 's'}</span>
              </div>

              {q.image_url && (
                <div className="media-box">
                  <img src={q.image_url} alt="Question" />
                </div>
              )}
              {q.media_type === 'video' && q.media_url && (
                <div className="media-box">
                  <video controls src={q.media_url} />
                </div>
              )}
              {q.media_type === 'audio' && q.media_url && (
                <div className="media-box">
                  <audio controls src={q.media_url} />
                </div>
              )}
              <RichText as="p" text={q.text} />

              {hintsShown && (
                <div className="hints">
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <p className="muted" style={{ margin: 0 }}>
                      Need a nudge?
                    </p>
                    <span className="pill warn" style={{ fontSize: 10 }}>
                      −2 pts per hint
                    </span>
                  </div>
                  <div className="row">
                    {q.hints.map((h, i) => {
                      const key = `${q.id}:${i}`
                      return shownHints[key] ? (
                        <span key={i} className="hint-text">
                          {h}
                        </span>
                      ) : (
                        <button
                          key={i}
                          type="button"
                          className="btn ghost sm"
                          onClick={() => toggleHint(q.id, i)}
                        >
                          Hint {i + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {a ? (
                <>
                  <div className="row between">
                    <strong>Your answer</strong>
                    {scorePill(a)}
                  </div>
                  {isMultiple(q) ? (
                    <div className="segments">
                      {splitAnswerText(a.answer_text).map((seg, i) => (
                        <div className="segment-row" key={i}>
                          <span className="seg-label">{partLabel(i)}</span>
                          <span>{seg || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{a.answer_text}</p>
                  )}
                  {a.status === 'graded' && <Breakdown a={a} />}
                  {a.review ? (
                    <p className="review-note">
                      <strong>Review:</strong> {a.review}
                    </p>
                  ) : null}
                  {a.score === 1 && q.explanation && (
                    <p className="muted">💡 {q.explanation}</p>
                  )}
                </>
              ) : (
                <form onSubmit={(e) => handleSubmit(e, q)}>
                  {isMultiple(q) ? (
                    <div className="multi-answers">
                      {q.answer_parts.map((part, i) => (
                        <div className="multi-row" key={i}>
                          <span className="multi-label" title={`Answer ${partLabel(i)}`}>
                            {partLabel(i)}
                          </span>
                          <textarea
                            placeholder={`Answer ${partLabel(i)}`}
                            value={draftText(q.id, i)}
                            onChange={(e) => setDraft(q.id, i, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      placeholder="Type your answer…"
                      value={draftText(q.id, 0)}
                      onChange={(e) => setDraft(q.id, 0, e.target.value)}
                    />
                  )}
                  <div className="row" style={{ marginTop: 10 }}>
                    <button
                      className="btn"
                      type="submit"
                      disabled={submitting === q.id || !isDraftFilled(q)}
                    >
                      {submitting === q.id ? 'Submitting…' : 'Submit answer'}
                    </button>
                    {hc > 0 && (
                      <span className="pill warn">using {hc} hint{hc > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </form>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}