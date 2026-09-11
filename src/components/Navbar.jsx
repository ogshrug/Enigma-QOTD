import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabase'

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!user) return null

  return (
    <header className="navbar">
      <Link to="/" className="brand">Daily Quiz</Link>
      <nav>
        {profile?.role === 'admin' && (
          <>
            <Link to="/admin">Admin</Link>
            <Link to="/admin/new">New Question</Link>
            <Link to="/admin/grade">Grade</Link>
          </>
        )}
        {profile?.role === 'player' && (
          <>
            <Link to="/">Today</Link>
            <Link to="/history">History</Link>
          </>
        )}
        <button className="btn ghost" onClick={handleLogout}>Log out</button>
      </nav>
    </header>
  )
}