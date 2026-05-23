import localforage from 'localforage'

localforage.config({
  name: 'lyrics-pwa',
  storeName: 'lyrics_pwa_store',
})

export interface Favorite {
  id: number
  title: string
  titleWithFeatured?: string
  artist: string
  artistId: number
  coverArt: string
  url: string
  lyrics: string
  savedAt: number
  featuredArtists?: string[]
}

export interface SavedArtist {
  artistId: number
  name: string
  savedAt: number
}

const favPrefix = 'fav_'
const artistPrefix = 'artist_'
const recentKey = 'recent_songs'

export async function getFavorites(): Promise<Favorite[]> {
  const keys = await localforage.keys()
  const items = await Promise.all(
    keys.filter(k => k.startsWith(favPrefix)).map(k => localforage.getItem<Favorite>(k))
  )
  return items
    .filter((f): f is Favorite => f !== null)
    .sort((a, b) => b.savedAt - a.savedAt)
}

export async function addFavorite(song: Favorite) {
  await localforage.setItem(favPrefix + song.id, song)
}

export async function removeFavorite(id: number) {
  await localforage.removeItem(favPrefix + id)
}

export async function getFavoriteIds(): Promise<Set<number>> {
  const favs = await getFavorites()
  return new Set(favs.map(f => f.id))
}

export async function isFavorite(id: number): Promise<boolean> {
  return (await localforage.getItem(favPrefix + id)) !== null
}

export async function getSavedArtists(): Promise<SavedArtist[]> {
  const keys = await localforage.keys()
  const items = await Promise.all(
    keys.filter(k => k.startsWith(artistPrefix)).map(k => localforage.getItem<SavedArtist>(k))
  )
  return items
    .filter((a): a is SavedArtist => a !== null)
    .sort((a, b) => b.savedAt - a.savedAt)
}

export async function getSavedArtistIds(): Promise<Set<number>> {
  const artists = await getSavedArtists()
  return new Set(artists.map(a => a.artistId))
}

export async function saveArtist(artist: SavedArtist) {
  await localforage.setItem(artistPrefix + artist.artistId, artist)
}

export async function removeSavedArtist(artistId: number) {
  await localforage.removeItem(artistPrefix + artistId)
}

export async function isArtistSaved(artistId: number): Promise<boolean> {
  return (await localforage.getItem(artistPrefix + artistId)) !== null
}

export interface RecentSong {
  id: number
  title: string
  titleWithFeatured?: string
  artist: string
  artistId: number
  coverArt: string
  url: string
  viewedAt: number
  featuredArtists?: string[]
}

export async function getRecent(): Promise<RecentSong[]> {
  const data = await localforage.getItem<RecentSong[]>(recentKey)
  return data || []
}

export async function addRecent(song: { id: number; title: string; titleWithFeatured?: string; artist: string; artistId: number; coverArt: string; url: string; featuredArtists?: string[] }) {
  const recent = await getRecent()
  const filtered = recent.filter(s => s.id !== song.id)
  filtered.unshift({ ...song, viewedAt: Date.now() })
  await localforage.setItem(recentKey, filtered.slice(0, 10))
}

