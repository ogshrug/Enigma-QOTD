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
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Enigma Daily Quiz — home">
      <img src="/apple-touch-icon.png" alt="" className="brand-logo" />
      <span>Enigma</span>
    </Link>
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

  const initial = (profile?.name || profile?.email || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

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
          <div className="nav-user">
            {profile?.avatar_url ? (
              <img className="nav-avatar" src={profile.avatar_url} alt={profile.name || 'Your avatar'} />
            ) : (
              <span className="nav-avatar fallback" aria-hidden="true">
                {initial || '?'}
              </span>
            )}
            <button className="btn ghost sm" onClick={handleLogout} title="Log out">
              Log out
            </button>
          </div>
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
        <button className="tab" onClick={handleLogout} title="Log out">
          <span className="tab-icon" aria-hidden="true">
            {Icons.logout}
          </span>
          <span>Log out</span>
        </button>
      </nav>
    </>
  )
}