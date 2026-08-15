import DogRail from './DogRail'
import MessagePane from './MessagePane'
import Sidebar from './Sidebar'

export default function Shell() {
  return (
    <div className="shell">
      <Sidebar />
      <MessagePane />
      <DogRail />
    </div>
  )
}
