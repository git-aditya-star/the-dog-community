import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth'

export default function Auth() {
  const { user, ready, login, register } = useAuth()
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', display_name: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isNew) await register(form)
      else await login({ username: form.username, password: form.password })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="auth__mark">🐕</div>
        <h1>The Dog Community</h1>
        <p className="auth__lede">
          {isNew
            ? 'Make a spot for you and your dog.'
            : 'Welcome back. The pack has been waiting.'}
        </p>

        {error && <div className="alert">{error}</div>}

        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="field__input"
            value={form.username}
            onChange={set('username')}
            placeholder="maya"
            autoComplete="username"
            required
          />
        </label>

        {isNew && (
          <label className="field">
            <span className="field__label">Display name</span>
            <input
              className="field__input"
              value={form.display_name}
              onChange={set('display_name')}
              placeholder="Maya"
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__input"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="at least 6 characters"
            autoComplete={isNew ? 'new-password' : 'current-password'}
            required
          />
        </label>

        <button className="btn btn--block" disabled={busy}>
          {busy ? 'One moment…' : isNew ? 'Join the community' : 'Sign in'}
        </button>

        <p className="auth__switch">
          {isNew ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setIsNew(!isNew)
              setError(null)
            }}
          >
            {isNew ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  )
}
