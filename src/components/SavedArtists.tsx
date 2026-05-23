import type { SavedArtist } from '../store/db'
import './SavedArtists.css'

interface Props {
  artists: SavedArtist[]
  onSelect: (artistId: number, artistName: string) => void
  onRemove: (artistId: number) => void
}

export default function SavedArtists({ artists, onSelect, onRemove }: Props) {
  if (!artists.length) {
    return <p className="empty">Nessun artista salvato</p>
  }
  return (
    <div className="list">
      {artists.map(a => (
        <div key={a.artistId} className="card">
          <div className="info" onClick={() => onSelect(a.artistId, a.name)}>
            <div className="name">{a.name}</div>
            <div className="date">Salvato il {new Date(a.savedAt).toLocaleDateString('it-IT')}</div>
          </div>
          <button onClick={() => onRemove(a.artistId)} className="removeBtn" title="Rimuovi">✕</button>
        </div>
      ))}
    </div>
  )
}
