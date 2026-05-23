import { useState, useCallback, useEffect, useRef } from 'react'
import SearchBar from './components/SearchBar'
import SongList from './components/SongList'
import LyricsView from './components/LyricsView'
import SavedArtists from './components/SavedArtists'
import { searchSongs, getArtistSongsById, findArtistByName } from './services/genius'
import { getFavorites, getSavedArtists, saveArtist, removeSavedArtist, isArtistSaved, getSavedArtistIds, getRecent, addRecent, addFavorite, removeFavorite, getFavoriteIds, type Favorite, type SavedArtist, type RecentSong } from './store/db'
import type { GeniusHit } from './types'
import logo_img from './assets/logo_img.png'
import heart_fill from './assets/heart-fill.png'
import heart from './assets/heart.png'
import './App.css'

export default function App() {
  const [songs, setSongs] = useState<GeniusHit[]>([])
  const [selected, setSelected] = useState<GeniusHit | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([])
  const [savedArtistIds, setSavedArtistIds] = useState<Set<number>>(new Set())
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>([])
  const [browsingArtist, setBrowsingArtist] = useState<{ id: number; name: string } | null>(null)
  const [browsingArtistSaved, setBrowsingArtistSaved] = useState(false)
  const [saveTargetArtist, setSaveTargetArtist] = useState<{ id: number; name: string } | null>(null)
  const [saveTargetArtistSaved, setSaveTargetArtistSaved] = useState(false)
  const [searchTitle, setSearchTitle] = useState('')
  const [searchArtist, setSearchArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'search' | 'favorites' | 'artists'>('search')
  const [hasSearched, setHasSearched] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const hasSearchedRef = useRef(hasSearched)
  hasSearchedRef.current = hasSearched
  const searchIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTop = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo(0, 0)
    el.style.overflow = 'hidden'
    setTimeout(() => {
      if (el) el.style.overflow = ''
    }, 100)
  }, [])

  const refreshSavedArtists = useCallback(async () => {
    const [artists, ids] = await Promise.all([getSavedArtists(), getSavedArtistIds()])
    setSavedArtists(artists)
    setSavedArtistIds(ids)
  }, [])

  useEffect(() => { refreshSavedArtists() }, [refreshSavedArtists])

  useEffect(() => {
    getRecent().then(setRecentSongs)
    getFavoriteIds().then(setFavoriteIds)
  }, [])

  const selectSong = useCallback((song: GeniusHit) => {
    addRecent({ id: song.id, title: song.title, titleWithFeatured: song.titleWithFeatured, artist: song.artist, artistId: song.artistId, coverArt: song.coverArt, url: song.url, featuredArtists: song.featuredArtists })
    setRecentSongs(prev => [{ id: song.id, title: song.title, titleWithFeatured: song.titleWithFeatured, artist: song.artist, artistId: song.artistId, coverArt: song.coverArt, url: song.url, viewedAt: Date.now(), featuredArtists: song.featuredArtists }, ...prev.filter(s => s.id !== song.id)].slice(0, 10))
    setSelected(song)
  }, [])

  const handleToggleFavorite = useCallback(async (song: GeniusHit) => {
    if (favoriteIds.has(song.id)) {
      await removeFavorite(song.id)
      setFavoriteIds(prev => { const next = new Set(prev); next.delete(song.id); return next })
      setFavorites(prev => prev.filter(f => f.id !== song.id))
    } else {
      await addFavorite({ ...song, lyrics: '', savedAt: Date.now() })
      setFavoriteIds(prev => { const next = new Set(prev); next.add(song.id); return next })
    }
  }, [favoriteIds])

  const handleReset = useCallback(() => {
    setSongs([])
    setHasSearched(false)
    setBrowsingArtist(null)
    setSaveTargetArtist(null)
    setSearchTitle('')
    setSearchArtist('')
    setLoading(false)
    setError('')
  }, [])

  const handleSearch = useCallback(async ({ title, artist }: { title: string; artist?: string }) => {
    const id = ++searchIdRef.current
    setLoading(true)
    setError('')
    setBrowsingArtist(null)
    setSaveTargetArtist(null)
    setHasSearched(true)
    try {
      const results = await searchSongs(title, artist, savedArtists.map(a => ({ id: a.artistId, name: a.name })))
      if (id !== searchIdRef.current) return
      setSongs(results)
      setTab('search')
      scrollTop()
      const matched = artist && results.find(r => r.artist.toLowerCase() === artist.toLowerCase())
      const targetArtist = matched
        ? { id: matched.artistId, name: matched.artist }
        : artist ? await findArtistByName(artist)
        : results[0] ? { id: results[0].artistId, name: results[0].artist }
        : null
      if (targetArtist) {
        if (id !== searchIdRef.current) return
        setSaveTargetArtist(targetArtist)
        isArtistSaved(targetArtist.id).then(saved => {
          if (id === searchIdRef.current) setSaveTargetArtistSaved(saved)
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      if (id === searchIdRef.current) setLoading(false)
    }
  }, [savedArtistIds])

  const handleArtistSongs = useCallback(() => {
    setSelected(null)
    if (!hasSearchedRef.current) {
      setHasSearched(false)
      setSongs([])
      setBrowsingArtist(null)
      setSaveTargetArtist(null)
      setSearchTitle('')
      setSearchArtist('')
      setLoading(false)
      setError('')
    }
  }, [])

  const handleArtistClick = useCallback(async (artistId: number, artistName: string) => {
    setSearchArtist(artistName)
    setLoading(true)
    setError('')
    setSelected(null)
    setHasSearched(true)
    setBrowsingArtist({ id: artistId, name: artistName })
    setBrowsingArtistSaved(await isArtistSaved(artistId))
    try {
      const results = await getArtistSongsById(artistId)
      setSongs(results)
      setTab('search')
      scrollTop()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveTargetArtist = async () => {
    if (!saveTargetArtist) return
    if (saveTargetArtistSaved) {
      await removeSavedArtist(saveTargetArtist.id)
      setSaveTargetArtistSaved(false)
    } else {
      await saveArtist({ artistId: saveTargetArtist.id, name: saveTargetArtist.name, savedAt: Date.now() })
      setSaveTargetArtistSaved(true)
    }
    refreshSavedArtists()
  }

  const handleSaveArtistFromSong = async (artistId: number, artistName: string) => {
    const saved = await isArtistSaved(artistId)
    if (saved) {
      await removeSavedArtist(artistId)
    } else {
      await saveArtist({ artistId, name: artistName, savedAt: Date.now() })
    }
    if (browsingArtist?.id === artistId) setBrowsingArtistSaved(!saved)
    refreshSavedArtists()
  }

  const showFavorites = useCallback(async () => {
    scrollTop()
    const favs = await getFavorites()
    setFavorites(favs)
    setTab('favorites')
    setSelected(null)
  }, [scrollTop])

  const showArtists = useCallback(async () => {
    scrollTop()
    await refreshSavedArtists()
    setTab('artists')
    setSelected(null)
  }, [refreshSavedArtists, scrollTop])

  const handleRemoveArtist = useCallback(async (artistId: number) => {
    await removeSavedArtist(artistId)
    refreshSavedArtists()
  }, [refreshSavedArtists])

  const handleSelectArtist = useCallback((artistId: number, artistName: string) => {
    handleArtistClick(artistId, artistName)
  }, [handleArtistClick])

  if (selected) {
    return (
      <div className="container">
        <LyricsView song={selected} onBack={() => { setSelected(null); setHasSearched(false); setSongs([]); setBrowsingArtist(null); setSaveTargetArtist(null); setSearchTitle(''); setSearchArtist(''); setLoading(false); setError('') }} onArtistSongs={handleArtistSongs} />
      </div>
    )
  }

  const hasArtistSongs = browsingArtist && songs.length > 0

  const savedSongs = !browsingArtist && savedArtistIds.size > 0
    ? songs.filter(s => savedArtistIds.has(s.artistId))
    : []
  const otherSongs = !browsingArtist
    ? songs.filter(s => !savedArtistIds.has(s.artistId))
    : []

  const showSearchSongs = !hasArtistSongs && songs.length > 0 && hasSearched

  return (
    <div className="container">
      <div className="header">
        <img src={logo_img} className='logo_img' alt="" />
        <h1 className="logo">Lyrics</h1>
      </div>

      {tab === 'search'&&<><SearchBar onSearch={handleSearch} onReset={handleReset} loading={loading} hasSearched={hasSearched} title={searchTitle} onTitleChange={setSearchTitle} artist={searchArtist} onArtistChange={setSearchArtist} />
      {error && <p className="error">{error}</p>}</>}

      <div className="scrollArea" ref={scrollRef}>
        {tab === 'favorites' ? (
          favorites.length > 0 ? (
            <>
              <h2 className='title-page'>Brani preferiti</h2>
              <SongList songs={favorites} onSelect={selectSong} onArtistClick={handleArtistClick} onArtistNameClick={setSearchArtist} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />
            </>
          ) : (
            <>
              <h2 className='title-page'>Brani preferiti</h2>
              <p className="empty">Nessun preferito ancora</p>
            </>
          )
        ) : tab === 'artists' ? (
          <>
            <h2 className='title-page'>Artisti salvati</h2>
            <SavedArtists artists={savedArtists} onSelect={handleSelectArtist} onRemove={handleRemoveArtist} />
          </>
        ) : hasArtistSongs ? (
          <SongList
            songs={songs}
            onSelect={selectSong}
            onArtistClick={handleArtistClick}
            onArtistNameClick={setSearchArtist}
            onSaveArtist={handleSaveArtistFromSong}
            artistSaved={browsingArtistSaved}
            headerLabel={browsingArtist.name}
            headerArtistId={browsingArtist.id}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : showSearchSongs ? (
          <>
            {saveTargetArtist && (
              <div className="saveRow">
                <button onClick={handleSaveTargetArtist} className={`saveBtn ${saveTargetArtistSaved? 'unfollow':'follow'}`} >
                  {saveTargetArtistSaved ? 'Rimuovi ' : 'Salva '} <b>{saveTargetArtist.name}</b>
                </button>
              </div>
            )}
            {savedSongs.length > 0 && (
              <SongList songs={savedSongs} onSelect={selectSong} onArtistClick={handleArtistClick} onArtistNameClick={setSearchArtist} headerLabel="Artisti salvati" favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />
            )}
            {otherSongs.length > 0 && (
              <div style={savedSongs.length > 0 ? { marginTop: 16 } : undefined}>
                {savedSongs.length > 0 && <div className="dividerLabel">Altri risultati</div>}
                <SongList songs={otherSongs} onSelect={selectSong} onArtistClick={handleArtistClick} onArtistNameClick={setSearchArtist} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />
              </div>
            )}
          </>
        ) : tab === 'search' && recentSongs.length > 0 && !hasSearched ? (
          <>
            <div className="dividerLabel" style={{ marginBottom: 8 }}>Brani recenti</div>
            <SongList songs={recentSongs} onSelect={selectSong} onArtistClick={handleArtistClick} onArtistNameClick={setSearchArtist} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />
          </>
        ) : null}
        
        <div className='sfumat-list'/>
      </div>
      <div className="tabs">
        <button onClick={() => { setTab('search'); scrollTop() }} className={'tabBtn' + (tab === 'search' ? ' tabActive' : '')}><div className='sfumat-btn'></div>Cerca</button>
        <button onClick={showFavorites} className={'tabBtn' + (tab === 'favorites' ? ' tabActive' : '')}><div className='sfumat-btn'></div>
          <div className={`icon ${tab === 'favorites' ? 'fill' : null}`}></div>
        </button>
        <button onClick={showArtists} className={'tabBtn' + (tab === 'artists' ? ' tabActive' : '')}><div className='sfumat-btn'></div>Artisti</button>
      </div>
    </div>
  )
}
