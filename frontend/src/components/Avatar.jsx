import { API_BASE } from '../api'

const TINTS = 8

// stable across reloads, so a member keeps their colour.
// 37 spreads the seeded usernames across six distinct tints
function tint(seed) {
  let h = 0
  for (const ch of seed) h = (h * 37 + ch.codePointAt(0)) % 100000
  return h % TINTS
}

export default function Avatar({ name = '?', seed, url, isBot, large, small }) {
  const cls = [
    'avatar',
    large && 'avatar--lg',
    small && 'avatar--sm',
    isBot && 'avatar--bot',
    !isBot && !url && `avatar--c${tint(seed || name)}`,
  ]
    .filter(Boolean)
    .join(' ')
  // a stored path is served by the backend, not by this dev server
  const src = url?.startsWith('/uploads/') ? API_BASE + url : url
  if (src) return <img className={cls} src={src} alt={name} />
  return <div className={cls}>{name.trim().charAt(0).toUpperCase()}</div>
}
