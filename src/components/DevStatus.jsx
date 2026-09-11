import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function DevStatus() {
  const { user, profile, loading, error } = useAuth()
  const { pathname } = useLocation()
  if (!import.meta.env.DEV) return null

  const bits = [
    `path: ${pathname}`,
    `signed in: ${user ? user.email : 'no'}`,
    `profile: ${profile ? profile.role : 'none'}`,
    `loading: ${loading}`,
  ]
  if (error) bits.push(`error: ${error}`)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: '#0f172a',
        borderTop: '1px solid #334155',
        color: '#fbbf24',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '4px 10px',
      }}
    >
      {bits.join('  |  ')}
    </div>
  )
}