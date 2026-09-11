import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AdminDashboard() {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  async function load() {
    setLoading(true)
    const qRes = await supabase
      .from('questions')
      .select('*')
      .order('question_date', { ascending: false })
      .order('position', { ascending: true })
    const aRes = await supabase.from('answers').select('*')
    if (qRes.error) setError(qRes.error.message)
    else setQuestions(qRes.data ?? [])
    if (aRes.error) setError((e) => e || aRes.error.message)
    else setAnswers(aRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const pending = answers.filter((a) => a.status === 'pending').length
  const graded = answers.filter((a) => a.status === 'graded').length

  async function handleReset(e) {
    e.preventDefault()
    if (!phrase.trim()) return
    setResetting(true)
    setResetMsg('')
    const { error } = await supabase.rpc('reset_quiz', { reset_passphrase: phrase.trim() })
    if (error) {
      setResetMsg('Wrong passphrase or something went wrong — nothing was deleted.')
      setResetting(false)
      return
    }
    const storageErr = await supabase.storage.from('media').emptyBucket('media')
    if (!storageErr.error) {
      setResetMsg('Quiz reset — all questions, scores, and uploads cleared.')
    } else {
      setResetMsg('Scores and questions cleared. (Media cleanup failed — remove old uploads manually.)')
    }
    setPhrase('')
    setConfirmOpen(false)
    setResetting(false)
    await load()
  }

  function dangerZone() {
    if (!confirmOpen) {
      return (
        <button className="btn bad" onClick={() => setConfirmOpen(true)}>
          Reset quiz
        </button>
      )
    }
    return (
      <form onSubmit={handleReset} className="reset-form">
        <p className="muted" style={{ marginTop: 0 }}>
          Permanently deletes every question, score, and uploaded file.
          This cannot be undone. Enter the reset passphrase to confirm.
        </p>
        <input
          type="password"
          autoComplete="off"
          placeholder="Reset passphrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          disabled={resetting}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn bad" type="submit" disabled={resetting || !phrase.trim()}>
            {resetting ? 'Resetting…' : 'Confirm reset'}
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={resetting}
            onClick={() => {
              setConfirmOpen(false)
              setPhrase('')
              setResetMsg('')
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  if (loading) return <p className="muted">Loading…</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="row between">
        <h2>Admin dashboard</h2>
        <Link className="btn" to="/admin/new">+ New question</Link>
      </div>

      <div className="row">
        <div className="metric-card">
          <p className="metric-label">Questions</p>
          <p className="metric-value">{questions.length}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Answers</p>
          <p className="metric-value">{answers.length}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">
            Pending review
            {pending > 0 && <span className="pill warn">{pending}</span>}
          </p>
          <p className="metric-value">{pending}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Graded</p>
          <p className="metric-value">{graded}</p>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Questions</h2>
          <Link to="/admin/grade">Grade answers ({pending} pending)</Link>
        </div>
        {questions.length === 0 && <p className="muted">No questions yet.</p>}
        <ul className="plain">
          {questions.map((q) => (
            <li key={q.id}>
              <div className="row between">
                <span>{q.question_date}</span>
                {q.active ? (
                  <span className="pill good">active</span>
                ) : (
                  <span className="pill neutral">inactive</span>
                )}
              </div>
              <p>{q.text}</p>
              <p className="muted">
                {Array.isArray(q.answer_parts) && q.answer_parts.length > 0
                  ? q.answer_parts.map((p) => `"${p.text}" (${p.points})`).join(' + ')
                  : `Answer: ${q.answer_phrase || '—'}`}{' '}
                | Total {q.points || 1} pt | Hints:{' '}
                {Array.isArray(q.hints) ? q.hints.filter(Boolean).length : 0} |{' '}
                {q.image_url ? 'Image ' : ''}
                {q.media_type !== 'none' ? q.media_type : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)' }}>
        <div className="row between">
          <h3 style={{ margin: 0, color: 'var(--destructive)' }}>Danger zone</h3>
          {dangerZone()}
        </div>
        {resetMsg && <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>{resetMsg}</p>}
      </div>
    </div>
  )
}