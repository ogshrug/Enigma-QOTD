import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { SkeletonCard } from '../components/Skeleton'

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PlayersAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notReady, setNotReady] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('admin_player_scores')
      if (cancelled) return
      if (error) {
        // Friendly fallback when the SQL hasn't been run in Supabase yet.
        if (/PGRST202|Could not find the function|function .* does not exist/i.test(error.message))
          setNotReady('Players backend not set up yet — the SQL script has to be re-run in Supabase first.')
        else setError(error.message)
      } else {
        setRows(data ?? [])
        setError('')
      }
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
  if (notReady) return <p className="error">{notReady}</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Players</h2>
          <span className="pill info">{rows.length} registered</span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
          Everyone registered as a player, with their total points (same scoring
          as the leaderboard). Admin-only.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card center">
          <p className="muted">No players registered yet.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table className="players-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Joined</th>
                  <th className="num">Days</th>
                  <th className="num">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.profile_id}>
                    <td>
                      <span className="pt-avatar-wrap">
                        {r.avatar_url ? (
                          <img className="pt-avatar" src={r.avatar_url} alt="" />
                        ) : (
                          <span className="pt-avatar fb">{initials(r.player_name)}</span>
                        )}
                        <strong>{r.player_name}</strong>
                      </span>
                    </td>
                    <td className="muted">{r.email || '—'}</td>
                    <td>{r.class_section || '—'}</td>
                    <td className="muted">{fmtDate(r.joined_at)}</td>
                    <td className="num mono">{r.days_answered}</td>
                    <td className={`num mono${r.total_points < 0 ? ' neg' : ''}`}>
                      {r.total_points > 0 ? `+${r.total_points}` : r.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}