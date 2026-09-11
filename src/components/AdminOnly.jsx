import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AdminOnly() {
  const { user, profile, loading } = useAuth()

  if (loading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/role" replace />
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}