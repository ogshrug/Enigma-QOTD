import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { SkeletonCard } from '../components/Skeleton'
import { isMultiple, partLabel, splitAnswerText } from '../lib/answerParts'
import RichText from '../components/RichText'

export default function History() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('answers')
        .select('*, questions(text, question_date, answer_parts)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        setError(error.message)
      } else {
        setRows(data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  if (loading) return <SkeletonCard />
  if (error) return <p className="error">{error}</p>

  if (rows.length === 0) {
    return (
      <div className="card center">
        <h2>No answers yet</h2>
        <p className="muted">Answer today's question to get started!</p>
      </div>
    )
  }

  function pill(a) {
    if (a.status === 'pending') return <span className="pill warn">Under review</span>
    const pts = a.points_earned ?? 0
    if (pts > 0) return <span className="pill good">+{pts} pt{pts === 1 ? '' : 's'}</span>
    if (pts === 0) return <span className="pill neutral">0 pts</span>
    return <span className="pill bad">{pts} pts</span>
  }

  return (
    <div>
      <h2>Your history</h2>
      <ul className="plain">
        {rows.map((a) => (
          <li key={a.id}>
            <div className="row between">
              <span className="muted">
                {a.questions?.question_date ?? new Date(a.created_at).toLocaleDateString()}
              </span>
              {pill(a)}
            </div>
            <RichText as="p" text={a.questions?.text ?? 'Unknown question'} />
            {isMultiple(a.questions) ? (
              <div className="segments" style={{ margin: '6px 0' }}>
                {splitAnswerText(a.answer_text).map((seg, i) => (
                  <div className="segment-row" key={i}>
                    <span className="seg-label">{partLabel(i)}</span>
                    <span>{seg || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">You: {a.answer_text}</p>
            )}
            {a.review ? (
              <p className="review-note" style={{ marginTop: 8 }}>
                <strong>Review:</strong> {a.review}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}