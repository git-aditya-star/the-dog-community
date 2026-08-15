import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import DogRail from './DogRail'
import MessagePane from './MessagePane'
import Sidebar from './Sidebar'
import { api } from '../api'
import { useAuth } from '../auth'
import { SocketProvider } from '../socket'

export default function Shell() {
  const { token } = useAuth()
  // one of the two is set, depending on which route matched
  const { slug, username } = useParams()
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [people, setPeople] = useState([])

  useEffect(() => {
    api('/api/channels', { token })
      .then(setChannels)
      .catch(() => setChannels([]))
    api('/api/users', { token })
      .then(setPeople)
      .catch(() => setPeople([]))
  }, [token])

  const publics = channels.filter((c) => c.kind === 'public')
  const dms = channels.filter((c) => c.kind === 'dm')

  // urls carry a channel name or a person's handle; everything below works in ids
  const channel = username
    ? dms.find((c) => c.other?.username === username) || null
    : publics.find((c) => c.name === slug) || publics[0] || null

  const startDm = async (userId) => {
    const dm = await api('/api/dms', { method: 'POST', body: { user_id: userId }, token })
    // the row may already have existed, so add it only if it is new
    setChannels((prev) => (prev.some((c) => c.id === dm.id) ? prev : [...prev, dm]))
    navigate(`/d/${dm.other.username}`)
  }

  return (
    <SocketProvider>
      <div className="shell">
        <Sidebar publics={publics} dms={dms} people={people} onStartDm={startDm} />
        <MessagePane channel={channel} />
        <DogRail />
      </div>
    </SocketProvider>
  )
}
