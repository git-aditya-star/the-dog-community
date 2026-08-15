export default function Avatar({ name = '?', url, isBot, large }) {
  const cls = ['avatar', large && 'avatar--lg', isBot && 'avatar--bot'].filter(Boolean).join(' ')
  if (url) return <img className={cls} src={url} alt={name} />
  return <div className={cls}>{name.trim().charAt(0).toUpperCase()}</div>
}
