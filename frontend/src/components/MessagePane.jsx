import { useEffect, useRef, useState } from 'react'

import Avatar from './Avatar'
import { api } from '../api'
import { useAuth } from '../auth'
import { useSocket } from '../socket'

function clock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function MessagePane({ channel }) {
  const { token } = useAuth()
  const { send, subscribe } = useSocket()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const foot = useRef(null)
  const channelId = channel?.id

  useEffect(() => {
    if (!channelId) return undefined
    let stale = false
    setMessages([])
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
        if (m.type === 'message' && m.channel_id === channelId) {
          setMessages((prev) => [...prev, m])
        }
      }),
    [subscribe, channelId],
  )

  useEffect(() => {
    foot.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const submit = (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !channelId) return
    if (send({ type: 'send', channel_id: channelId, body })) setDraft('')
  }

  if (!channel) return <section className="pane" />

  return (
    <section className="pane">
      <header className="pane__top">
        <span className="pane__title">#{channel.name}</span>
        <span className="pane__topic">{channel.topic}</span>
      </header>

      <div className="pane__body">
        {messages.length === 0 ? (
          <div className="empty">
            <div className="empty__mark">🦴</div>
            <h2>Nobody has barked yet</h2>
            <p className="empty__text">
              This is the beginning of #{channel.name}. Messages will land here.
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
                  <p className="msg__body">{m.body}</p>
                </div>
              </article>
            )
          })
        )}
        <div ref={foot} />
      </div>

      <footer className="pane__foot">
        <form className="composer" onSubmit={submit}>
          <input
            className="composer__input"
            placeholder={`Message #${channel.name}`}
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
