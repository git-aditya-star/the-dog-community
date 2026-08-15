import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import Avatar from './Avatar'
import { useAuth } from '../auth'

export default function Sidebar({ publics, dms, people, onStartDm }) {
  const { user, logout } = useAuth()
  const [picking, setPicking] = useState(false)

  const pick = (id) => {
    setPicking(false)
    onStartDm(id)
  }

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">🐕</span>
        <span className="sidebar__brand-name">
          The Dog
          <br />
          Community
        </span>
      </div>

      <div className="sidebar__label">Channels</div>
      {publics.map((c) => (
        <NavLink
          key={c.id}
          to={`/c/${c.name}`}
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
        >
          <span className="sidebar__link-hash">#</span>
          {c.name}
        </NavLink>
      ))}

      <div className="sidebar__label">
        Direct messages
        <button
          className="sidebar__add"
          onClick={() => setPicking((v) => !v)}
          title="Start a conversation"
        >
          +
        </button>
      </div>

      {picking && (
        <div className="picker">
          {people.length === 0 ? (
            <p className="picker__empty">Nobody else has joined yet.</p>
          ) : (
            people.map((p) => (
              <button key={p.id} className="picker__row" onClick={() => pick(p.id)}>
                <Avatar name={p.display_name} url={p.avatar_url} isBot={p.is_bot} small />
                <span className="picker__name">{p.display_name}</span>
                <span className="picker__handle">@{p.username}</span>
              </button>
            ))
          )}
        </div>
      )}

      {dms.map((c) => (
        <NavLink
          key={c.id}
          to={`/d/${c.other.username}`}
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
        >
          <Avatar name={c.other.display_name} url={c.other.avatar_url} isBot={c.other.is_bot} small />
          {c.other.display_name}
        </NavLink>
      ))}

      <div className="sidebar__me">
        <Avatar name={user.display_name} url={user.avatar_url} />
        <div>
          <div className="sidebar__me-name">{user.display_name}</div>
          <div className="sidebar__me-handle">@{user.username}</div>
        </div>
        <button className="sidebar__out" onClick={logout}>
          Leave
        </button>
      </div>
    </nav>
  )
}
