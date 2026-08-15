import { useEffect, useState } from 'react'

import AddDog from './AddDog'
import Avatar from './Avatar'
import { api, API_BASE } from '../api'
import { useAuth } from '../auth'

export default function DogRail() {
  const { token } = useAuth()
  const [dogs, setDogs] = useState([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api('/api/dogs', { token })
      .then(setDogs)
      .catch(() => setDogs([]))
  }, [token])

  const added = (dog) => {
    setDogs((prev) => [...prev, dog])
    setAdding(false)
  }

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

      {dogs.map((dog) => (
        <div className="dogcard" key={dog.id}>
          <Avatar
            name={dog.name}
            url={dog.photo_url ? API_BASE + dog.photo_url : undefined}
            large
          />
          <div>
            <div className="dogcard__name">{dog.name}</div>
            <div className="dogcard__breed">
              {dog.breed || 'Breed unknown'} · {dog.owner.display_name}
            </div>
          </div>
        </div>
      ))}

      <button className="dogcard dogcard--empty" onClick={() => setAdding(true)}>
        + Add your dog
      </button>

      {adding && <AddDog onClose={() => setAdding(false)} onAdded={added} />}
    </aside>
  )
}
