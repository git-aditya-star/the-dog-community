import { NavLink } from 'react-router-dom'

import Avatar from './Avatar'
import { useAuth } from '../auth'
import { CHANNELS } from '../channels'

export default function Sidebar() {
  const { user, logout } = useAuth()

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
      {CHANNELS.map((c) => (
        <NavLink
          key={c.slug}
          to={`/c/${c.slug}`}
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
        >
          <span className="sidebar__link-hash">#</span>
          {c.name}
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
