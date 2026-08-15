import { useParams } from 'react-router-dom'

import { CHANNELS } from '../channels'

export default function MessagePane() {
  const { slug } = useParams()
  const channel = CHANNELS.find((c) => c.slug === slug) || CHANNELS[0]

  return (
    <section className="pane">
      <header className="pane__top">
        <span className="pane__title">#{channel.name}</span>
        <span className="pane__topic">{channel.topic}</span>
      </header>

      <div className="pane__body">
        <div className="empty">
          <div className="empty__mark">🦴</div>
          <h2>Nobody has barked yet</h2>
          <p className="empty__text">
            This is the beginning of #{channel.name}. Messages will land here.
          </p>
        </div>
      </div>

      <footer className="pane__foot">
        <div className="composer">
          <input
            className="composer__input"
            placeholder={`Message #${channel.name}`}
            disabled
          />
          <button className="btn composer__send" disabled>
            Send
          </button>
        </div>
      </footer>
    </section>
  )
}
