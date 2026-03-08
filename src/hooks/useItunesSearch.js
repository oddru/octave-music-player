import { useState, useCallback, useRef } from 'react';

/**
 * Hook for searching the iTunes Search API and fetching track metadata.
 * No API key required — fully public.
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
export function useItunesSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const search = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const encoded = encodeURIComponent(query.trim());
      const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=25`;
      const res = await fetch(url, { signal: abortRef.current.signal });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const tracks = data.results
        .filter((item) => item.previewUrl) // only include tracks with a 30s preview
        .map((item) => ({
          id: `itunes-${item.trackId}`,
          title: item.trackName || 'Unknown Title',
          artist: item.artistName || 'Unknown Artist',
          album: item.collectionName || '',
          artwork: item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '500x500bb')
            : null,
          artworkThumb: item.artworkUrl100 || null,
          durationMs: item.trackTimeMillis || 0,
          uri: item.previewUrl,
          isItunes: true,
          genre: item.primaryGenreName || '',
          itunesId: item.trackId,
        }));

      setResults(tracks);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Could not reach iTunes. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  /**
   * Fetch iTunes metadata for a local track to enrich it with artwork.
   * Returns { artwork, album, genre } or null.
   */
  const fetchMetadataForLocalTrack = useCallback(async (title, artist) => {
    try {
      const query = encodeURIComponent(`${title} ${artist}`);
      const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results.length > 0) {
        const item = data.results[0];
        return {
          artwork: item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '500x500bb')
            : null,
          album: item.collectionName || '',
          genre: item.primaryGenreName || '',
        };
      }
    } catch {
      // Silently fail — metadata is enhancement only
    }
    return null;
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clear,
    fetchMetadataForLocalTrack,
  };
}
