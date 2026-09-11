import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

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
        .select('*, questions(text, question_date)')
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

  if (loading) return <p className="muted">Loading your history…</p>

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
    return a.score === 1 ? (
      <span className="pill good">
        +{a.points_earned ?? 1} pt{a.points_earned === 1 ? '' : 's'}
      </span>
    ) : (
      <span className="pill bad">0 pts</span>
    )
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
            <p>{a.questions?.text ?? 'Unknown question'}</p>
            <p className="muted">You: {a.answer_text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}