import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { SkeletonCard } from '../components/Skeleton'

const MEDALS = [
  { label: '1', cls: 'rank gold' },
  { label: '2', cls: 'rank silver' },
  { label: '3', cls: 'rank bronze' },
]

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('leaderboard')
      if (cancelled) return
      if (error) setError(error.message)
      else setRows(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading)
    return (
      <div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Leaderboard</h2>
          <span className="pill info">Daily questions only</span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
          Points come only from the daily question. Hints cost 2 pts each.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card center">
          <p className="muted">No graded answers yet — be the first on the board!</p>
        </div>
      ) : (
        <ul className="plain leaderboard">
          {rows.map((r, i) => {
            const medal = MEDALS[i] ?? { label: String(i + 1), cls: 'rank' }
            const isMe = r.profile_id === user.id
            return (
              <li key={r.profile_id} className={`lb-row${isMe ? ' me' : ''}`}>
                <span className={medal.cls}>{medal.label}</span>
                {r.avatar_url ? (
                  <img className="lb-avatar" src={r.avatar_url} alt="" />
                ) : (
                  <span className="lb-avatar fallback">{initials(r.player_name)}</span>
                )}
                <div className="lb-meta">
                  <strong>
                    {r.player_name}
                    {isMe && <span className="pill info" style={{ marginLeft: 8 }}>you</span>}
                  </strong>
                  <span className="muted">
                    {r.days_answered} day{r.days_answered === 1 ? '' : 's'}
                  </span>
                </div>
                <span className={`lb-score${r.total_points < 0 ? ' negative' : ''}`}>
                  {r.total_points > 0 ? `+${r.total_points}` : r.total_points}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}