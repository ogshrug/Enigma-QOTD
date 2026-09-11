import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/enigmadpsn/' },
  { label: 'WhatsApp group', href: 'https://chat.whatsapp.com/FA4vx70zpKG1Za9y4CnTRA' },
  { label: 'enigmaquizclub@gmail.com', href: 'mailto:enigmaquizclub@gmail.com', newTab: false },
]

function GoogleSignIn() {
  return (
    <a
      href="/login"
      onClick={async (e) => {
        e.preventDefault()
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
      }}
    >
      Sign in with Google
    </a>
  )
}

export default function Footer() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const play = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/new', label: 'New question' },
        { to: '/admin/grade', label: 'Grade answers' },
      ]
    : [
        { to: '/', label: "Today's question" },
        { to: '/leaderboard', label: 'Leaderboard' },
        { to: '/history', label: 'My history' },
      ]

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>
            <img src="/apple-touch-icon.png" alt="" className="footer-logo" />
            <span>Enigma</span>
          </strong>
          <p>
            The school quiz club. One new question every day — test yourself, climb
            the leaderboard, and keep your streak alive.
          </p>
        </div>

        <div className="footer-col">
          <h4>{isAdmin ? 'Admin' : 'Play'}</h4>
          {play.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
          {!user && <GoogleSignIn />}
        </div>

        <div className="footer-col">
          <h4>About Enigma</h4>
          <Link to="/leaderboard">Season leaderboard</Link>
          <Link to="/history">How scoring works</Link>
          <p className="tiny" style={{ marginTop: 10 }}>
            Hints cost 2 pts. Answer before midnight — it resets every day.
          </p>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              {...(s.newTab === false ? {} : { target: '_blank', rel: 'noreferrer' })}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Enigma Quiz Club</span>
        <span>Made by the Enigma team</span>
      </div>
    </footer>
  )
}