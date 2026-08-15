import Avatar from './Avatar'

export default function DogRail() {
  return (
    <aside className="rail">
      <div className="rail__head">The pack</div>

      <div className="dogcard">
        <Avatar name="Barkley" isBot large />
        <div>
          <div className="dogcard__name">Barkley</div>
          <div className="dogcard__breed">Golden Retriever · resident know-it-all</div>
        </div>
      </div>

      <div className="dogcard dogcard--empty">
        Your dog belongs here. Registration opens with photos.
      </div>
    </aside>
  )
}
