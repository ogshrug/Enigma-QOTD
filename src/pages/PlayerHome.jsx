import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function PlayerHome() {
  const { user, profile } = useAuth()
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [submission, setSubmission] = useState(null)
  const [shownHints, setShownHints] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const refreshTimer = useRef(null)

  const today = todayStr()

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />

  const loadMyAnswer = async (questionId) => {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', questionId)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!error) setSubmission(data)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const qRes = await supabase
        .from('questions')
        .select('*')
        .eq('question_date', today)
        .limit(1)

      if (cancelled) return
      const qdoc = qRes.data?.[0]
      if (!qdoc || qRes.error) {
        setQuestion(null)
        setLoading(false)
        return
      }

      setQuestion(qdoc)
      await loadMyAnswer(qdoc.id)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [today, user.id])

  // Refresh grading status while the page is open without the admin regrading.
  useEffect(() => {
    if (question?.id && refreshTimer.current === null) {
      refreshTimer.current = setInterval(() => {
        loadMyAnswer(question.id)
      }, 10000)
    }
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [question?.id, user.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question || !answer.trim()) return
    setSubmitting(true)
    setError('')
    const { data, error } = await supabase
      .from('answers')
      .insert({
        question_id: question.id,
        profile_id: user.id,
        answer_text: answer.trim(),
        hints_used: hintsUsed,
      })
      .select()
      .maybeSingle()
    if (error) {
      setError(error.message)
    } else {
      setAnswer('')
      setSubmission(data)
    }
    setSubmitting(false)
  }

  if (loading) return <p className="muted">Loading today's question…</p>

  if (!question) {
    return (
      <div className="card center">
        <h1>No question today</h1>
        <p className="muted">
          An admin hasn't posted a question for {today}. Check back later!
        </p>
      </div>
    )
  }

  function scorePill(s) {
    if (!s) return null
    if (s.status === 'pending') return <span className="pill warn">Under review</span>
    const pts = s.points_earned ?? 0
    if (pts > 0) return <span className="pill good">+{pts} pt{pts === 1 ? '' : 's'}</span>
    if (pts === 0) return <span className="pill neutral">0 pts</span>
    return <span className="pill bad">{pts} pts</span>
  }

  function toggleHint(i) {
    setShownHints((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const qTotal =
    Array.isArray(question.answer_parts) && question.answer_parts.length > 0
      ? question.answer_parts.reduce((s, p) => s + (Number(p.points) || 0), 0)
      : question.points

  const hintsUsed = Object.values(shownHints).filter(Boolean).length

  return (
    <div>
      <div className="card">
        <div className="row between">
          <h2>Today's question</h2>
          <span className="pill neutral">
            worth {qTotal} pt{qTotal === 1 ? '' : 's'}
          </span>
        </div>
        {question.image_url && (
          <div className="media-box">
            <img src={question.image_url} alt="Question" />
          </div>
        )}
        {question.media_type === 'video' && question.media_url && (
          <div className="media-box">
            <video controls src={question.media_url} />
          </div>
        )}
        {question.media_type === 'audio' && question.media_url && (
          <div className="media-box">
            <audio controls src={question.media_url} />
          </div>
        )}
        <p>{question.text}</p>

        {Array.isArray(question.hints) && question.hints.length > 0 && (
          <div className="hints">
            <div className="row between" style={{ marginBottom: 6 }}>
              <p className="muted" style={{ margin: 0 }}>Need a nudge?</p>
              <span className="pill warn" style={{ fontSize: 10 }}>−2 pts per hint</span>
            </div>
            <div className="row">
              {question.hints.map((h, i) =>
                shownHints[i] ? (
                  <span key={i} className="hint-text">{h}</span>
                ) : (
                  <button key={i} type="button" className="btn ghost sm" onClick={() => toggleHint(i)}>
                    Hint {i + 1}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {submission ? (
        <div className="card">
          <div className="row between">
            <strong>Your answer</strong>
            {scorePill(submission)}
          </div>
          <p>{submission.answer_text}</p>
          {submission.status === 'graded' && (
            <div className="points-breakdown">
              <span className="row-line">
                <span className="muted">Base</span>
                <span>+{(submission.points_earned ?? 0) + (submission.hints_used ?? 0) * 2}</span>
              </span>
              {submission.hints_used > 0 && (
                <span className="row-line">
                  <span className="muted">{submission.hints_used} hint{submission.hints_used > 1 ? 's' : ''} (−2 each)</span>
                  <span className="bad-num">−{submission.hints_used * 2}</span>
                </span>
              )}
              <span className="row-line strong-line">
                <span>Net</span>
                <span>{(submission.points_earned ?? 0) > 0 ? `+${submission.points_earned}` : submission.points_earned ?? 0}</span>
              </span>
            </div>
          )}
          {submission.score === 1 && question.explanation && (
            <p className="muted">💡 {question.explanation}</p>
          )}
        </div>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          <label htmlFor="answer">Your answer</label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer in your own words…"
          />
          <div className="row">
            <button className="btn" type="submit" disabled={submitting || !answer.trim()}>
              {submitting ? 'Submitting…' : 'Submit answer'}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  )
}