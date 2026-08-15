import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import DogRail from './DogRail'
import MessagePane from './MessagePane'
import Sidebar from './Sidebar'
import { api } from '../api'
import { useAuth } from '../auth'
import { SocketProvider } from '../socket'

export default function Shell() {
  const { token } = useAuth()
  const { slug } = useParams()
  const [channels, setChannels] = useState([])

  useEffect(() => {
    api('/api/channels', { token })
      .then(setChannels)
      .catch(() => setChannels([]))
  }, [token])

  // urls carry the channel name; everything below works in ids
  const channel = channels.find((c) => c.name === slug) || channels[0] || null

  return (
    <SocketProvider>
      <div className="shell">
        <Sidebar channels={channels} />
        <MessagePane channel={channel} />
        <DogRail />
      </div>
    </SocketProvider>
  )
}
