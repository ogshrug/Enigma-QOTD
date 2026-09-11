import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabase'

const Icons = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  leaderboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H3v3a3 3 0 0 0 3 3h1" />
      <path d="M17 6h4v3a3 3 0 0 1-3 3h-1" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  grade: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <path d="M22 4 12 14l-3-3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

function initialsOf(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Enigma Daily Quiz — home">
      <img src="/apple-touch-icon.png" alt="" className="brand-logo" />
      <span>Enigma</span>
    </Link>
  )
}

function AvatarMenu({ profile, user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = initialsOf(profile?.name || profile?.email)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="avatar-menu" ref={ref}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        {profile?.avatar_url ? (
          <img className="nav-avatar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="nav-avatar fallback" aria-hidden="true">
            {initial || '?'}
          </span>
        )}
      </button>
      {open && (
        <div className="avatar-pop" role="menu">
          <div className="avatar-head">
            <strong>{profile?.name || 'Player'}</strong>
            <span>{user?.email}</span>
          </div>
          <Link className="avatar-item" to="/profile" onClick={() => setOpen(false)}>
            Edit profile
          </Link>
          <button
            type="button"
            className="avatar-item danger"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!user) {
    return (
      <header className="navbar top">
        <Brand />
        <nav className="desktop-nav" aria-label="Account">
          <Link className="btn sm" to="/login">
            Log in
          </Link>
        </nav>
      </header>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const tabs = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: Icons.dashboard, end: true },
        { to: '/admin/new', label: 'New', icon: Icons.edit },
        { to: '/admin/grade', label: 'Grade', icon: Icons.grade },
      ]
    : [
        { to: '/', label: 'Today', icon: Icons.today, end: true },
        { to: '/leaderboard', label: 'Ranks', icon: Icons.leaderboard },
        { to: '/history', label: 'History', icon: Icons.history },
      ]

  return (
    <>
      <header className="navbar top">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}>
              {t.label}
            </NavLink>
          ))}
          <AvatarMenu profile={profile} user={user} onLogout={handleLogout} />
        </nav>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="tab">
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
        <NavLink to="/profile" className="tab" end>
          <span className="tab-icon" aria-hidden="true">
            {Icons.user}
          </span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </>
  )
}