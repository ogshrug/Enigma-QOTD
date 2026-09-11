import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description') || params.get('error')
    if (oauthError) setError(oauthError)

    if (window.location.search.includes('code=') && !window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      if (user && profile) {
        navigate(profile.role === 'admin' ? '/admin' : '/', { replace: true })
      } else if (user && !profile) {
        navigate('/role', { replace: true })
      }
    }
  }, [user, profile, loading, navigate])

  async function handleLogin() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div className="center">
      <h1>Daily Quiz</h1>
      <p className="muted">Answer today's question. Compete. Climb.</p>
      <button className="btn" onClick={handleLogin} disabled={busy}>
        {busy ? 'Redirecting to Google…' : 'Sign in with Google'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}