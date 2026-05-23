import type { GeniusHit } from '../types'

function extractFeaturedArtists(titleWithFeatured: string, plainTitle: string): string[] {
  if (!titleWithFeatured || titleWithFeatured === plainTitle) return []
  const suffix = titleWithFeatured.slice(plainTitle.length).trim()
  const cleaned = suffix.replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').trim()
  const match = cleaned.match(/^(?:feat|ft|featuring|with)[\.:]\s*(.+)$/i)
  if (match) {
    return match[1].split(/[,&]\s*/).map(s => s.trim()).filter(Boolean)
  }
  return []
}

function toGeniusHit(result: { id: number; title: string; title_with_featured?: string; primary_artist: { name: string; id?: number }; song_art_image_thumbnail_url?: string; url: string }): GeniusHit {
  const plainTitle = result.title
  const twf = result.title_with_featured || plainTitle
  return {
    id: result.id,
    title: plainTitle,
    titleWithFeatured: twf,
    artist: result.primary_artist.name,
    artistId: result.primary_artist.id ?? 0,
    coverArt: result.song_art_image_thumbnail_url || '',
    url: result.url,
    featuredArtists: extractFeaturedArtists(twf, plainTitle),
  }
}

interface GeniusResponse {
  response: {
    hits: Array<{
      result: {
        id: number
        title: string
        title_with_featured: string
        primary_artist: { name: string; id: number }
        song_art_image_thumbnail_url: string
        url: string
      }
    }>
  }
}

interface ArtistSongsResponse {
  response: {
    songs: Array<{
      id: number
      title: string
      title_with_featured?: string
      primary_artist: { name: string; id: number }
      song_art_image_thumbnail_url: string
      url: string
    }>
  }
}

export async function findArtistByName(name: string): Promise<{ id: number; name: string } | null> {
  const res = await fetch(`/api/genius/search?q=${encodeURIComponent(name)}&per_page=5`)
  if (!res.ok) return null
  const data: GeniusResponse = await res.json()
  const lower = name.toLowerCase()
  const hit = data.response.hits.find(h =>
    h.result.primary_artist.name.toLowerCase().includes(lower)
  )
  return hit ? { id: hit.result.primary_artist.id, name: hit.result.primary_artist.name } : null
}

export async function searchSongs(title: string, artist?: string, savedArtists?: Array<{ id: number; name: string }>) {
  if (!title && artist) {
    try {
      return await searchArtistSongs(artist)
    } catch {
      // artist not found as primary — fall through to normal search
    }
  }

  const query = artist ? `${title} ${artist}` : title
  const res = await fetch(`/api/genius/search?q=${encodeURIComponent(query)}&per_page=20`)
  if (!res.ok) throw new Error('Genius API error')
  const data: GeniusResponse = await res.json()

  let hits = data.response.hits.map(hit => toGeniusHit(hit.result))

  if (!artist) {
    const words = title.toLowerCase().split(/\s+/)
    const titleMatch = hits.filter(h => words.every(w => h.title.toLowerCase().includes(w)))

    let savedMatches: typeof hits = []
    if (savedArtists && savedArtists.length > 0) {
      const results = await Promise.allSettled(
        savedArtists.map(a =>
          fetch(`/api/genius/search?q=${encodeURIComponent(title + ' ' + a.name)}&per_page=50`)
            .then(r => r.json() as Promise<GeniusResponse>)
            .then(d => d.response.hits.map(h => toGeniusHit(h.result)))
        )
      )

      const seen = new Set<number>()
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const h of r.value) {
            if (!seen.has(h.id) && words.every(w => h.title.toLowerCase().includes(w))) {
              seen.add(h.id)
              savedMatches.push(h)
            }
          }
        }
      }

      const allTitleMatch = titleMatch.length > 0
      if (allTitleMatch) {
        const seenGlobal = new Set(savedMatches.map(s => s.id))
        const others = titleMatch.filter(h => !seenGlobal.has(h.id))
        hits = [...savedMatches, ...others].slice(0, 20)
      } else {
        const seenGlobal = new Set(savedMatches.map(s => s.id))
        const others = hits.filter(h => !seenGlobal.has(h.id))
        hits = [...savedMatches, ...others].slice(0, 20)
      }
    } else {
      if (titleMatch.length > 0) hits = titleMatch
    }
  }

  return hits
}

async function searchArtistSongs(artist: string) {
  const searchRes = await fetch(`/api/genius/search?q=${encodeURIComponent(artist)}&per_page=20`)
  if (!searchRes.ok) throw new Error('Genius API error')
  const searchData: GeniusResponse = await searchRes.json()

  const lowerQuery = artist.toLowerCase()
  const artistHit = searchData.response.hits.find(
    h => h.result.primary_artist.name.toLowerCase().includes(lowerQuery)
  )
  if (!artistHit) throw new Error('Artista non trovato')

  const artistId = artistHit.result.primary_artist.id
  const allSongs: GeniusHit[] = []
  let page = 1

  while (true) {
    const res = await fetch(`/api/genius/artists/${artistId}/songs?sort=title&per_page=50&page=${page}`)
    if (!res.ok) break
    const data: ArtistSongsResponse = await res.json()
    const songs = data.response.songs
    if (!songs.length) break
    for (const s of songs) {
      const plainTitle = s.title
      const twf = s.title_with_featured || plainTitle
      allSongs.push({
        id: s.id,
        title: plainTitle,
        titleWithFeatured: twf,
        artist: s.primary_artist.name,
        artistId: s.primary_artist.id,
        coverArt: s.song_art_image_thumbnail_url || '',
        url: s.url,
        featuredArtists: extractFeaturedArtists(twf, plainTitle),
      })
    }
    page++
  }

  return allSongs
}

export async function getArtistSongsById(artistId: number): Promise<GeniusHit[]> {
  const allSongs: GeniusHit[] = []
  let page = 1

  while (true) {
    const res = await fetch(`/api/genius/artists/${artistId}/songs?sort=title&per_page=50&page=${page}`)
    if (!res.ok) break
    const data: ArtistSongsResponse = await res.json()
    const songs = data.response.songs
    if (!songs.length) break
    for (const s of songs) {
      const plainTitle = s.title
      const twf = s.title_with_featured || plainTitle
      allSongs.push({
        id: s.id,
        title: plainTitle,
        titleWithFeatured: twf,
        artist: s.primary_artist.name,
        artistId: s.primary_artist.id,
        coverArt: s.song_art_image_thumbnail_url || '',
        url: s.url,
        featuredArtists: extractFeaturedArtists(twf, plainTitle),
      })
    }
    page++
  }

  return allSongs
}

export async function fetchLyrics(artist: string, title: string): Promise<string> {
  const res = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  )
  if (!res.ok) throw new Error('Lyrics not found')
  const data = await res.json()
  return data.lyrics || 'Testo non disponibile'
}

export async function fetchLyricsSilent(artist: string, title: string): Promise<string | null> {
  try {
    return await fetchLyrics(artist, title)
  } catch {
    return null
  }
}
