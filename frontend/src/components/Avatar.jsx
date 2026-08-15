import { API_BASE } from '../api'

export default function Avatar({ name = '?', url, isBot, large, small }) {
  const cls = ['avatar', large && 'avatar--lg', small && 'avatar--sm', isBot && 'avatar--bot']
    .filter(Boolean)
    .join(' ')
  // a stored path is served by the backend, not by this dev server
  const src = url?.startsWith('/uploads/') ? API_BASE + url : url
  if (src) return <img className={cls} src={src} alt={name} />
  return <div className={cls}>{name.trim().charAt(0).toUpperCase()}</div>
}
