import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadProfile(uid) {
      if (!uid) return
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      if (!active) return
      if (error) {
        setError(error.message)
        setProfile(null)
      } else {
        setProfile(data)
        setError(null)
      }
      setLoading(false)
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!active) return
        setError(e.message)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setProfile(null)
          setError(null)
          setLoading(false)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function refreshProfile() {
    const uid = user?.id
    if (!uid) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      setError(error.message)
      return
    }
    setProfile(data)
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}