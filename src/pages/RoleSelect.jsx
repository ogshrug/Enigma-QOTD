import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const cardStyle = {
  background: 'var(--surface-container)',
  border: '1px solid var(--surface-bright)',
  borderRadius: 'var(--radius-card)',
  padding: '16px 20px',
  margin: '10px 0',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--on-surface)',
  fontSize: 15,
  fontWeight: 600,
  boxShadow: 'var(--shadow-card)',
  width: '100%',
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface-container-lowest)',
  color: 'var(--on-surface)',
  border: '1px solid var(--outline-strong)',
  borderRadius: 'var(--radius)',
  padding: '10px 12px',
  fontSize: 14,
}

export default function RoleSelect() {
  const { user, profile, refreshProfile } = useAuth()
  const [mode, setMode] = useState('pick') // pick | admin | player
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  async function createPlayer() {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
      avatar_url:
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.avatar ||
        '',
      role: 'player',
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await refreshProfile()
  }

  async function verifyAdmin() {
    if (!passphrase) {
      setError('Enter the admin passphrase.')
      return
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('create_admin_profile', {
      passphrase,
    })
    if (error) {
      const msg = String(error.message)
      if (msg.includes('INCORRECT_PASSPHRASE')) {
        setError('Incorrect passphrase.')
      } else if (msg.includes('SESSION_EXPIRED') || msg.includes('foreign key')) {
        setError('Your session expired — sign out and sign in again.')
      } else {
        setError(error.message)
      }
      setBusy(false)
      return
    }
    await refreshProfile()
  }

  if (mode === 'player') {
    return (
      <div>
        <h1>Player account</h1>
        {busy ? (
          <p>Creating your player account…</p>
        ) : (
          <p>
            Created successfully — one moment while we take you in.
          </p>
        )}
        {error && <p style={{ color: 'var(--destructive)' }}>{error}</p>}
      </div>
    )
  }

  if (mode === 'admin') {
    return (
      <div>
        <h1>Admin account</h1>
        <p className="muted">
          Enter the admin passphrase provided by the quiz organizer.
        </p>
        <label htmlFor="passphrase" style={{ display: 'block', margin: '12px 0 6px' }}>
          Admin passphrase
        </label>
        <input
          id="passphrase"
          type="text"
          autoComplete="off"
          style={inputStyle}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()}
        />
        <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
          <button className="btn" onClick={verifyAdmin} disabled={busy}>
            {busy ? 'Checking…' : 'Verify'}
          </button>
          {error.includes('session expired') ? (
            <button
              className="btn bad"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
            >
              Sign out
            </button>
          ) : (
            <button
              className="btn ghost"
              onClick={() => {
                setMode('pick')
                setPassphrase('')
                setError('')
              }}
            >
              Back
            </button>
          )}
        </div>
        {error && <p style={{ color: 'var(--destructive)' }}>{error}</p>}
        {import.meta.env.DEV && (
          <p style={{ color: 'var(--status-warning-text)', fontSize: 13 }}>
            signed in: {user ? user.email : 'NO USER'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1>One last thing</h1>
      <p className="muted">Pick the type of account you want.</p>

      <button
        style={cardStyle}
        disabled={busy}
        onClick={() => {
          setMode('player')
          createPlayer()
        }}
      >
        <strong>Player</strong>
        <br />
        <span className="muted">
          Answer the daily question and check your history.
        </span>
      </button>

      <button
        style={cardStyle}
        disabled={busy}
        onClick={() => {
          setMode('admin')
          setError('')
        }}
      >
        <strong>Admin</strong>
        <br />
        <span className="muted">
          Create questions and grade answers. Requires the admin passphrase.
        </span>
      </button>

      {error && <p style={{ color: 'var(--destructive)' }}>{error}</p>}

      <p className="muted" style={{ fontSize: 13 }}>
        Signed in as {user?.email || user?.id}
      </p>
    </div>
  )
}