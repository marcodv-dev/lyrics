import type { GeniusHit } from '../types'
import './SongList.css'
import heart from '../assets/heart.png'
import heart_fill from '../assets/heart-fill.png'

interface Props {
  songs: GeniusHit[]
  onSelect: (song: GeniusHit) => void
  onArtistClick?: (artistId: number, artistName: string) => void
  onArtistNameClick?: (artistName: string) => void
  onSaveArtist?: (artistId: number, artistName: string) => void
  onToggleFavorite?: (song: GeniusHit) => void
  favoriteIds?: Set<number>
  artistSaved?: boolean
  headerLabel?: string
  headerArtistId?: number
}

export default function SongList({ songs, onSelect, onArtistClick, onArtistNameClick, onSaveArtist, onToggleFavorite, favoriteIds, artistSaved, headerLabel, headerArtistId }: Props) {
  if (!songs.length) return null
  return (
    <div className="list">
      {headerLabel && onSaveArtist && (
        <div className="headerRow">
          <button onClick={()=>onSaveArtist(headerArtistId ?? songs[0].artistId, headerLabel)} className={`saveBtn ${artistSaved? 'unfollow':'follow'}`} >
            {artistSaved ? 'Rimuovi ' : 'Salva '} <b>{headerLabel}</b>
          </button>
        </div>
      )}
      {songs.map(song => {
        const feats = song.featuredArtists?.length ? song.featuredArtists : []
        return (
        <div key={song.id} className="card" onClick={() => onSelect(song)}>
          <img
            src={song.coverArt}
            alt=""
            className="cardImg"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="cardInfo">
            <div className="cardTitle">{song.title}</div>
            <div className="cardArtist">
              <span
                className="artistName"
                onClick={e => {
                  e.stopPropagation()
                  onArtistNameClick?.(song.artist)
                }}
              >
                {song.artist}
              </span>
              {feats.length > 0 && (
                <>
                  <span className="separator"> | </span>
                  {feats.map((fa, i) => (
                    <span key={i}>
                      {i > 0 && <span className="comma">, </span>}
                      <span
                        className="artistName"
                        onClick={e => {
                          e.stopPropagation()
                          onArtistNameClick?.(fa)
                        }}
                      >
                        {fa}
                      </span>
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
          {onToggleFavorite && (
            <button
              className="favBtn"
              onClick={e => { e.stopPropagation(); onToggleFavorite(song) }}
            >
              <div className={`icon ${favoriteIds?.has(song.id) ? 'fill':null}`}></div>
            </button>
          )}
        </div>
      )})}
    </div>
  )
}
