import { type FormEvent } from 'react'
import './SearchBar.css'

interface SearchParams {
  title: string
  artist?: string
}

interface Props {
  onSearch: (params: SearchParams) => void
  onReset: () => void
  loading: boolean
  hasSearched: boolean
  title: string
  onTitleChange: (title: string) => void
  artist: string
  onArtistChange: (artist: string) => void
}

export default function SearchBar({ onSearch, onReset, loading, hasSearched, title, onTitleChange, artist, onArtistChange }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !artist.trim()) return
    onSearch({ title: title.trim(), artist: artist.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="searchForm">
      <div className='inputs'>
        <input
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Titolo canzone"
          className="searchInput"
        />
        <input
          type="text"
          value={artist}
          onChange={e => onArtistChange(e.target.value)}
          placeholder="Artista"
          className="searchInputSmall"
        />
      </div>
      <div className='tabs-buttons'>
        <button type="submit" disabled={loading || (!title.trim() && !artist.trim())} className="searchBtn">
          {loading ? '...' : 'Cerca'}
        </button>
        {(hasSearched || title.trim() || artist.trim()) && (
          <button type="button" className="reset-search" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
    </form>
  )
}
