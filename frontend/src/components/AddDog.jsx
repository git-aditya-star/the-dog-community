import { useState } from 'react'

import { api, upload } from '../api'
import { useAuth } from '../auth'

export default function AddDog({ onClose, onAdded }) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !file || busy) return

    setBusy(true)
    setError(null)
    try {
      const { url } = await upload(file, token)
      const dog = await api('/api/dogs', {
        method: 'POST',
        body: { name: name.trim(), photo_url: url },
        token,
      })
      onAdded(dog)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal" onMouseDown={busy ? undefined : onClose}>
      <form
        className="modal__panel"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="modal__title">Add your dog</h2>

        {error && <div className="alert">{error}</div>}

        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rex"
            maxLength={80}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Photo</span>
          <input
            className="field__input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </label>

        <p className="modal__hint">
          {busy
            ? 'Sniffing the photo…'
            : 'The breed gets worked out from the photo. No need to type it.'}
        </p>

        <div className="modal__actions">
          <button type="button" className="btn btn--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" disabled={busy || !name.trim() || !file}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
