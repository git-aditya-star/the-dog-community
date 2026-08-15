import { useEffect, useState } from 'react'

import AddDog from './AddDog'
import Avatar from './Avatar'
import { api, API_BASE } from '../api'
import { useAuth } from '../auth'
import { useSocket } from '../socket'

export default function DogRail() {
  const { token } = useAuth()
  const { subscribe } = useSocket()
  const [dogs, setDogs] = useState([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api('/api/dogs', { token })
      .then(setDogs)
      .catch(() => setDogs([]))
  }, [token])

  // a dog added in any window lands in every rail
  const add = (dog) =>
    setDogs((prev) => (prev.some((d) => d.id === dog.id) ? prev : [...prev, dog]))

  useEffect(
    () =>
      subscribe((m) => {
        if (m.type === 'dog') add(m)
      }),
    [subscribe],
  )

  const added = (dog) => {
    add(dog)
    setAdding(false)
  }

  return (
    <aside className="rail">
      <div className="rail__head">The pack</div>

      {dogs.map((dog) => (
        <div className="dogcard" key={dog.id}>
          <Avatar
            name={dog.name}
            url={dog.photo_url ? API_BASE + dog.photo_url : undefined}
            isBot={dog.owner.is_bot}
            large
          />
          <div>
            <div className="dogcard__name">{dog.name}</div>
            <div className="dogcard__breed">
              {dog.breed || 'Breed unknown'} ·{' '}
              {dog.owner.is_bot ? 'resident know-it-all' : dog.owner.display_name}
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
