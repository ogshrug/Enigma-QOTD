import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SetupError from './SetupError'

export default function Protected() {
  const { user, profile, loading, error } = useAuth()

  if (loading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (error) return <SetupError message={error} />
  if (!profile) return <Navigate to="/role" replace />

  return <Outlet />
}