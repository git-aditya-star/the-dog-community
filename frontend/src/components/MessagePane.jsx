import { useEffect, useRef, useState } from 'react'

import Avatar from './Avatar'
import { api, API_BASE, upload } from '../api'
import { useAuth } from '../auth'
import { useSocket } from '../socket'

function clock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function MessagePane({ channel }) {
  const { token } = useAuth()
  const { send, subscribe } = useSocket()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(null)
  const [problem, setProblem] = useState('')
  const foot = useRef(null)
  const file = useRef(null)
  const channelId = channel?.id

  useEffect(() => {
    if (!channelId) return undefined
    let stale = false
    setMessages([])
    setTyping(false)
    setPending(null)
    api(`/api/channels/${channelId}/messages`, { token })
      .then((rows) => {
        if (!stale) setMessages(rows)
      })
      .catch(() => {})
    // a slow fetch for the channel we just left must not land here
    return () => {
      stale = true
    }
  }, [channelId, token])

  useEffect(
    () =>
      subscribe((m) => {
        if (m.channel_id !== channelId) return
        if (m.type === 'message') {
          setMessages((prev) => [...prev, m])
          // his message is the end of his turn, whatever the frames said
          if (m.user.is_bot) setTyping(false)
        }
        if (m.type === 'typing') setTyping(Boolean(m.on))
      }),
    [subscribe, channelId],
  )

  const toFoot = () => foot.current?.scrollIntoView({ block: 'end' })

  useEffect(() => {
    toFoot()
  }, [messages, typing])

  const submit = (e) => {
    e.preventDefault()
    const body = draft.trim()
    if ((!body && !pending) || !channelId) return
    const frame = { type: 'send', channel_id: channelId, body, image_url: pending }
    if (send(frame)) {
      setDraft('')
      setPending(null)
    }
  }

  // uploaded on pick, held on the draft, sent with whatever is typed
  const attach = async (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked || !channelId) return
    setProblem('')
    try {
      const { url } = await upload(picked, token)
      setPending(url)
    } catch (err) {
      setProblem(err.message)
    }
  }

  if (!channel) return <section className="pane" />

  const isDm = channel.kind === 'dm'
  const title = isDm ? channel.other.display_name : `#${channel.name}`

  return (
    <section className="pane">
      <header className="pane__top">
        <span className="pane__title">{title}</span>
        <span className="pane__topic">{isDm ? `@${channel.other.username}` : channel.topic}</span>
      </header>

      <div className="pane__body">
        {messages.length === 0 ? (
          <div className="empty">
            <div className="empty__mark">🦴</div>
            <h2>Nobody has barked yet</h2>
            <p className="empty__text">
              {isDm
                ? `Just you and ${channel.other.display_name} here. Say hello.`
                : `This is the beginning of #${channel.name}. Messages will land here.`}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const grouped = prev && prev.user.id === m.user.id
            return (
              <article key={m.id} className={`msg${grouped ? ' msg--grouped' : ''}`}>
                <div className="msg__side">
                  {grouped ? (
                    <span className="msg__stamp">{clock(m.created_at)}</span>
                  ) : (
                    <Avatar
                      name={m.user.display_name}
                      seed={m.user.username}
                      url={m.user.avatar_url}
                      isBot={m.user.is_bot}
                    />
                  )}
                </div>
                <div className="msg__main">
                  {!grouped && (
                    <div className="msg__head">
                      <span className="msg__name">{m.user.display_name}</span>
                      <span className="msg__time">{clock(m.created_at)}</span>
                    </div>
                  )}
                  {m.body && <p className="msg__body">{m.body}</p>}
                  {m.image_url && (
                    <a
                      className="msg__shot"
                      href={API_BASE + m.image_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* a photo lands after the scroll, so scroll again */}
                      <img
                        src={API_BASE + m.image_url}
                        alt="Shared by the pack"
                        onLoad={toFoot}
                      />
                    </a>
                  )}
                </div>
              </article>
            )
          })
        )}
        {typing && (
          <div className="typing">
            <span className="typing__dots">
              <i />
              <i />
              <i />
            </span>
            Barkley is thinking
          </div>
        )}
        <div ref={foot} />
      </div>

      <footer className="pane__foot">
        {problem && <p className="composer__problem">{problem}</p>}
        {pending && (
          <div className="pending">
            <img src={API_BASE + pending} alt="Ready to send" />
            <button type="button" className="pending__drop" onClick={() => setPending(null)}>
              ×
            </button>
          </div>
        )}
        <form className="composer" onSubmit={submit}>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={attach}
          />
          <button
            className="composer__clip"
            type="button"
            title="Send a photo"
            onClick={() => file.current?.click()}
          >
            📎
          </button>
          <input
            className="composer__input"
            placeholder={`Message ${isDm ? `@${channel.other.username}` : title}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn composer__send" type="submit">
            Send
          </button>
        </form>
      </footer>
    </section>
  )
}
