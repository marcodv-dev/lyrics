import { useState, useEffect } from 'react'
import type { GeniusHit } from '../types'
import { fetchLyricsSilent } from '../services/genius'
import { addFavorite, removeFavorite, isFavorite, saveArtist, removeSavedArtist, isArtistSaved } from '../store/db'
import './LyricsView.css'
import back from '../assets/left-chevron.png'
import heart from '../assets/heart.png'
import heart_fill from '../assets/heart-fill.png'

interface Props {
  song: GeniusHit
  onBack: () => void
  onArtistSongs: (artistId: number, artistName: string) => void
}

export default function LyricsView({ song, onBack, onArtistSongs }: Props) {
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fav, setFav] = useState(false)
  const [artistSaved, setArtistSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchLyricsSilent(song.artist, song.title)
      .then(setLyrics)
      .finally(() => setLoading(false))
    isFavorite(song.id).then(setFav)
    isArtistSaved(song.artistId).then(setArtistSaved)
  }, [song])

  const toggleFav = async () => {
    if (fav) {
      await removeFavorite(song.id)
      setFav(false)
    } else {
      await addFavorite({ ...song, lyrics: lyrics ?? '', savedAt: Date.now() })
      setFav(true)
    }
  }

  const toggleArtist = async () => {
    if (artistSaved) {
      await removeSavedArtist(song.artistId)
      setArtistSaved(false)
    } else {
      await saveArtist({ artistId: song.artistId, name: song.artist, savedAt: Date.now() })
      setArtistSaved(true)
    }
  }

  return (
    <div className="lyricsView">
      <div className="header">
        <button onClick={() => onArtistSongs(song.artistId, song.artist)} className="artistLink">
          <img src={back} alt="" />
        </button>
        <div className='song-data'>
          <h2 className="title">{song.title}</h2>
          <div className="artistRow">
            <span className="artist">{song.artist}</span>
          </div>
        </div>
        <img src={song.coverArt} alt="" className="cover" />
      </div>
      <div className="scrollLyrics">
        {loading ? (
          <p className="loading">Caricamento...</p>
        ) : lyrics ? (
          <div className="lyrics">
            {lyrics.split('\n\n').map((verse, i) => (
              <div key={i} className="verse">
                {verse.split('\n').map((line, j) => (
                  <div key={j} className="line">
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="notFound">
            <p>Testo non trovato su Lyrics.ovh</p>
            <a href={song.url} target="_blank" rel="noopener noreferrer" className="geniusLink">
              Vedi su Genius →
            </a>
          </div>
        )}
      </div>
      <div className="actions">
        <button onClick={toggleArtist} className={`actionBtn ${artistSaved? 'unfollow':'follow'}`} title={artistSaved ? 'Rimuovi artista' : 'Salva artista'}>
          <label htmlFor="">{artistSaved ? 'Rimuovi ' : 'Salva '} <b>{song.artist}</b></label>
        </button>
        <button onClick={toggleFav} className="actionBtn" title={fav ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}>
          <img src={fav ? heart_fill : heart} alt="" />
        </button>
      </div>
    </div>
  )
}
