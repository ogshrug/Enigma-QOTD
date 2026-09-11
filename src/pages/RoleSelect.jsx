import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const cardStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 10,
  padding: '16px 20px',
  margin: '10px 0',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#e2e8f0',
  fontSize: 16,
  width: '100%',
}

const inputStyle = {
  width: '100%',
  background: '#0f172a',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 15,
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
      setError(
        String(error.message).includes('INCORRECT_PASSPHRASE')
          ? 'Incorrect passphrase.'
          : error.message
      )
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
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </div>
    )
  }

  if (mode === 'admin') {
    return (
      <div>
        <h1>Admin account</h1>
        <p style={{ color: '#94a3b8' }}>
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
        </div>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        {import.meta.env.DEV && (
          <p style={{ color: '#fbbf24', fontSize: 13 }}>
            signed in: {user ? user.email : 'NO USER'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1>One last thing</h1>
      <p style={{ color: '#94a3b8' }}>Pick the type of account you want.</p>

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
        <span style={{ color: '#94a3b8' }}>
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
        <span style={{ color: '#94a3b8' }}>
          Create questions and grade answers. Requires the admin passphrase.
        </span>
      </button>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      <p style={{ color: '#94a3b8', fontSize: 13 }}>
        Signed in as {user?.email || user?.id}
      </p>
    </div>
  )
}