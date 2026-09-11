import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

export default function GradeAnswers() {
  const { user } = useAuth()
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('answers')
      .select('*, questions(text, points)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setAnswers(data ?? [])
      setError('')
    }
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

  async function grade(id, correct, answerRow) {
    setBusyId(id)
    setError('')
    const points = correct ? questionTotal(answerRow.questions) : 0
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

  function questionTotal(q) {
    if (Array.isArray(q?.answer_parts) && q.answer_parts.length > 0) {
      return q.answer_parts.reduce((s, p) => s + (Number(p.points) || 0), 0)
    }
    return q?.points ?? 1
  }

  function answerRow(a) {
    const total = questionTotal(a.questions)
    const earned = a.points_earned ?? 0
    return (
      <li key={a.id} style={{ borderBottom: '3px solid var(--border)', padding: '14px 2px' }}>
        <p>
          <strong>{a.questions?.text ?? 'Unknown question'}</strong>
        </p>
        <p className="muted">{a.answer_text}</p>
        {Array.isArray(a.questions?.answer_parts) && a.questions.answer_parts.length > 0 && (
          <p className="muted">
            Parts: {a.questions.answer_parts.map((p) => `"${p.text}" (${p.points})`).join(', ')}
          </p>
        )}
        <div className="row between">
          <span className="muted">
            {a.auto_matched && a.status === 'graded'
              ? 'Auto-graded full marks'
              : a.status === 'graded'
              ? 'Manually graded'
              : a.auto_matched
              ? 'Uncertain — review manually (only some parts matched)'
              : 'No match — review'}
          </span>
          <div className="row">
            {a.status === 'pending' ? (
              <span className="pill warn">Under review</span>
            ) : earned > 0 ? (
              <span className="pill good">+{earned}/{total} pts</span>
            ) : (
              <span className="pill bad">0/{total} pts</span>
            )}
            <button
              className="btn good"
              disabled={busyId === a.id}
              onClick={() => grade(a.id, true, a)}
            >
              Full ({total})
            </button>
            <button
              className="btn bad"
              disabled={busyId === a.id}
              onClick={() => grade(a.id, false, a)}
            >
              0
            </button>
          </div>
        </div>
      </li>
    )
  }

  if (loading) return <p className="muted">Loading answers…</p>

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