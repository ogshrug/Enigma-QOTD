import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'
import Countdown from '../components/Countdown'

const Icons = {
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H3v3a3 3 0 0 0 3 3h1" />
      <path d="M17 6h4v3a3 3 0 0 1-3 3h-1" />
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M12 3v4m0 10v4M3 12h4m10 0h4" />
      <path d="m5.5 5.5 2.2 2.2m8.6 8.6 2.2 2.2m0-13-2.2 2.2m-8.6 8.6-2.2 2.2" />
    </svg>
  ),
}

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

  return (
    <div>
      <section className="hero-wrap">
        <div className="hero">
          <img src="/apple-touch-icon.png" alt="Enigma club logo" className="hero-logo" />
          <span className="hero-kicker">Enigma Quiz Club · Daily puzzle</span>
          <h1 className="hero-title">
            A question a day,
            <br />
            <span className="grad">stay one step ahead.</span>
          </h1>
          <p className="hero-sub">
            One fresh question every morning. Test yourself, beat your friends on the
            leaderboard, and keep the streak alive.
          </p>
          <Countdown label="Next question in" />
          <div className="hero-actions">
            <button className="btn xl" onClick={handleLogin} disabled={busy}>
              {busy ? 'Redirecting to Google…' : 'Play today’s quiz'}
            </button>
            <a className="btn ghost xl" href="#about">
              How it works
            </a>
          </div>
          {error && <p className="error">{error}</p>}

          <div className="hero-tiles">
            <div className="hero-tile">
              <span className="orb" aria-hidden="true">{Icons.bolt}</span>
              <strong>Daily question</strong>
              <span>One question worth points, posted every day by the club.</span>
            </div>
            <div className="hero-tile">
              <span className="orb" aria-hidden="true">{Icons.trophy}</span>
              <strong>Leaderboard</strong>
              <span>Scores from every round — see who’s top of the club.</span>
            </div>
            <div className="hero-tile">
              <span className="orb" aria-hidden="true">{Icons.flame}</span>
              <strong>Streaks</strong>
              <span>Come back daily to keep your streak burning.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card about-card" id="about">
        <h2 style={{ marginTop: 0 }}>What is Enigma Daily Quiz?</h2>
        <p className="muted">
          Enigma is your school’s quiz club. Instead of waiting for the next meet, we
          drop <strong>one question every day</strong> right here — a habit-sized slice
          of general knowledge you can fit into your routine.
        </p>
        <div className="about-rows">
          <div className="about-row">
            <span className="orb" aria-hidden="true">{Icons.bolt}</span>
            <span>
              <strong>Answer before midnight.</strong> The quiz resets daily, so every
              morning is a fresh chance to earn points.
            </span>
          </div>
          <div className="about-row">
            <span className="orb" aria-hidden="true">{Icons.sparkles}</span>
            <span>
              <strong>Stuck? Take a hint.</strong> Each hint costs 2 points — use them
              wisely.
            </span>
          </div>
          <div className="about-row">
            <span className="orb" aria-hidden="true">{Icons.trophy}</span>
            <span>
              <strong>Climb the board.</strong> The season leaderboard tracks everyone’s
              points from daily questions only.
            </span>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Sign in with your school Google account to play — it only takes a second.
        </p>
      </section>
    </div>
  )
}