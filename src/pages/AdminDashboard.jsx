import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AdminDashboard() {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const qRes = await supabase
        .from('questions')
        .select('*')
        .order('question_date', { ascending: false })
      const aRes = await supabase.from('answers').select('*')
      if (cancelled) return
      if (qRes.error) setError(qRes.error.message)
      else setQuestions(qRes.data ?? [])
      if (aRes.error) setError((e) => e || aRes.error.message)
      else setAnswers(aRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const pending = answers.filter((a) => a.status === 'pending').length
  const graded = answers.filter((a) => a.status === 'graded').length

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
    </div>
  )
}