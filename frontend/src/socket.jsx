import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

import { useAuth } from './auth'

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { token } = useAuth()
  const sock = useRef(null)
  const listeners = useRef(new Set())

  useEffect(() => {
    if (!token) return undefined

    let closing = false
    let retry

    const open = () => {
      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`)
      sock.current = ws
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        listeners.current.forEach((fn) => fn(data))
      }
      // a restarted backend should not need a page reload
      ws.onclose = () => {
        if (!closing) retry = setTimeout(open, 2000)
      }
    }

    open()
    return () => {
      closing = true
      clearTimeout(retry)
      sock.current?.close()
    }
  }, [token])

  const send = useCallback((payload) => {
    if (sock.current?.readyState === WebSocket.OPEN) {
      sock.current.send(JSON.stringify(payload))
      return true
    }
    return false
  }, [])

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn)
    return () => listeners.current.delete(fn)
  }, [])

  return <SocketContext.Provider value={{ send, subscribe }}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
