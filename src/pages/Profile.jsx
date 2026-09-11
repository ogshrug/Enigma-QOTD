import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import { SkeletonCard } from '../components/Skeleton'

export default function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const ready = typeof profile?.name === 'string'
  useEffect(() => {
    if (ready) {
      setName(profile.name ?? '')
      setSection(profile.class_section ?? '')
    }
  }, [ready, profile?.name, profile?.class_section])

  async function handleSave(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      setError('Enter a username.')
      return
    }
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ name: n, class_section: section.trim() })
      .eq('id', user.id)
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    await refreshProfile()
    setSaved(true)
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading || !ready) return <SkeletonCard />

  const initial = (profile?.name || profile?.email || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  if (profile.role === 'admin') {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center' }}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${profile.name || 'Your'} avatar`}
              style={{
                width: 72,
                height: 72,
                borderRadius: '999px',
                objectFit: 'cover',
                marginBottom: 8,
              }}
            />
          ) : (
            <span
              className="nav-avatar fallback"
              style={{ width: 72, height: 72, fontSize: 24, marginBottom: 8 }}
              aria-hidden="true"
            >
              {initial || '?'}
            </span>
          )}
          <h2 style={{ margin: '8px 0 2px' }}>{profile.name || 'Admin'}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {user?.email}
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <span className="pill gold">Admin</span>
          </p>
        </div>

        <div className="card" style={{ borderColor: 'rgba(241, 106, 106, 0.35)' }}>
          <div className="row between">
            <h3 style={{ margin: 0, color: 'var(--destructive)' }}>Account</h3>
            <button className="btn bad sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
            Signing out returns you to the landing page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`${profile.name || 'Your'} avatar`}
            style={{
              width: 72,
              height: 72,
              borderRadius: '999px',
              objectFit: 'cover',
              marginBottom: 8,
            }}
          />
        ) : (
          <span
            className="nav-avatar fallback"
            style={{ width: 72, height: 72, fontSize: 24, marginBottom: 8 }}
            aria-hidden="true"
          >
            {initial || '?'}
          </span>
        )}
        <h2 style={{ margin: '8px 0 2px' }}>{profile.name || 'Player'}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {user?.email}
        </p>
        {profile.role === 'admin' && (
          <p style={{ margin: '6px 0 0' }}>
            <span className="pill gold">Admin</span>
          </p>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleSave}>
          <label htmlFor="pf-name">Username</label>
          <input
            id="pf-name"
            type="text"
            maxLength={40}
            placeholder="How you appear on the leaderboard"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label htmlFor="pf-section">Class &amp; section</label>
          <input
            id="pf-section"
            type="text"
            maxLength={20}
            placeholder="e.g. 11-A"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            So your classmates can find you on the board.
          </p>

          {error && <p className="error">{error}</p>}
          {saved && (
            <p className="pill good" style={{ marginTop: 12 }}>
              Saved
            </p>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ borderColor: 'rgba(241, 106, 106, 0.35)' }}>
        <div className="row between">
          <h3 style={{ margin: 0, color: 'var(--destructive)' }}>Account</h3>
          <button className="btn bad sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
          Signing out returns you to the landing page and keeps your progress safe.
        </p>
      </div>
    </div>
  )
}