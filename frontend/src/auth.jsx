import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { api } from './api'

const KEY = 'dogcommunity.token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(KEY))
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setReady(true)
      return
    }
    api('/api/me', { token })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(KEY)
        setToken(null)
      })
      .finally(() => setReady(true))
  }, [token])

  const enter = useCallback(async (path, body) => {
    const data = await api(path, { method: 'POST', body })
    localStorage.setItem(KEY, data.access_token)
    setUser(data.user)
    setToken(data.access_token)
  }, [])

  const value = {
    user,
    token,
    ready,
    login: (body) => enter('/api/login', body),
    register: (body) => enter('/api/register', body),
    logout: () => {
      localStorage.removeItem(KEY)
      setToken(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}
