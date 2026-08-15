export default function Avatar({ name = '?', url, isBot, large, small }) {
  const cls = ['avatar', large && 'avatar--lg', small && 'avatar--sm', isBot && 'avatar--bot']
    .filter(Boolean)
    .join(' ')
  if (url) return <img className={cls} src={url} alt={name} />
  return <div className={cls}>{name.trim().charAt(0).toUpperCase()}</div>
}
