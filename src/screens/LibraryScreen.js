import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';

import { usePlayer } from '../context/PlayerContext';
import { useItunesSearch } from '../hooks/useItunesSearch';
import TrackItem from '../components/TrackItem';
import MiniPlayer from '../components/MiniPlayer';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Try to parse "Artist - Title" or just use filename as title */
const parseFilename = (filename) => {
  const name = filename.replace(/\.[^/.]+$/, ''); // strip extension
  if (name.includes(' - ')) {
    const dashIdx = name.indexOf(' - ');
    return {
      artist: name.substring(0, dashIdx).trim(),
      title: name.substring(dashIdx + 3).trim(),
    };
  }
  return { artist: 'Unknown Artist', title: name };
};

/** Convert a MediaLibrary asset to our unified track format */
const assetToTrack = (asset) => {
  const { artist, title } = parseFilename(asset.filename);
  return {
    id: `local-${asset.id}`,
    title,
    artist,
    album: '',
    artwork: null,
    artworkThumb: null,
    durationMs: (asset.duration || 0) * 1000, // expo-media-library gives seconds
    uri: asset.uri,
    isItunes: false,
    genre: '',
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LibraryScreen({ navigation }) {
  const { currentTrack, isPlaying, loadAndPlay } = usePlayer();
  const { results: itunesResults, loading: itunesLoading, error: itunesError, search, clear } =
    useItunesSearch();

  const [localTracks, setLocalTracks] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchTimerRef = useRef(null);
  const isSearching = searchQuery.trim().length > 0;

  // ── Load local music
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoadingLocal(false);
        return;
      }

      try {
        // Fetch up to 500 audio files
        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          sortBy: MediaLibrary.SortBy.default,
          first: 500,
        });
        setLocalTracks(assets.map(assetToTrack));
      } catch (err) {
        console.error('[Library] Failed to load local tracks:', err);
      } finally {
        setLoadingLocal(false);
      }
    })();
  }, []);

  // ── Debounced iTunes search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      clear();
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      search(searchQuery);
    }, 450);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, search, clear]);

  // ── Handle track press
  const handleTrackPress = useCallback(
    (track, index) => {
      const queue = isSearching ? itunesResults : localTracks;
      loadAndPlay(track, queue, index);
      navigation.navigate('NowPlaying');
    },
    [isSearching, itunesResults, localTracks, loadAndPlay, navigation]
  );

  const handleClearSearch = () => {
    setSearchQuery('');
    clear();
  };

  // ── Render helpers
  const displayTracks = isSearching ? itunesResults : localTracks;
  const isLoading = isSearching ? itunesLoading : loadingLocal;

  const renderTrack = useCallback(
    ({ item, index }) => (
      <TrackItem
        track={item}
        index={index}
        isActive={currentTrack?.id === item.id}
        isPlaying={isPlaying && currentTrack?.id === item.id}
        onPress={handleTrackPress}
      />
    ),
    [currentTrack, isPlaying, handleTrackPress]
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.appTitle}>PULSAR</Text>
          <Text style={styles.appSubtitle}>Music Player</Text>
        </View>
        <View style={styles.headerIconRow}>
          <Ionicons name="radio-outline" size={22} color={COLORS.accentLight} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={isSearchFocused ? COLORS.accentLight : COLORS.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search iTunes…"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section Label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {isSearching ? 'ITUNES RESULTS' : 'MY MUSIC'}
        </Text>
        {!isSearching && !loadingLocal && (
          <Text style={styles.sectionCount}>{localTracks.length} tracks</Text>
        )}
        {isSearching && itunesLoading && (
          <ActivityIndicator size="small" color={COLORS.accent} />
        )}
      </View>
    </View>
  );

  // ── Empty & Error states
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.centerStateText}>
            {isSearching ? 'Searching iTunes…' : 'Loading your music…'}
          </Text>
        </View>
      );
    }

    if (permissionDenied) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.centerStateTitle}>Access Denied</Text>
          <Text style={styles.centerStateText}>
            Pulsar needs permission to access your music files. Please grant Media
            Library access in your device settings.
          </Text>
        </View>
      );
    }

    if (itunesError && isSearching) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="wifi-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.centerStateTitle}>Connection Error</Text>
          <Text style={styles.centerStateText}>{itunesError}</Text>
        </View>
      );
    }

    if (isSearching && !itunesLoading) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="musical-notes-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.centerStateTitle}>No Results</Text>
          <Text style={styles.centerStateText}>
            Try a different song, artist, or album name.
          </Text>
        </View>
      );
    }

    if (!isSearching && !loadingLocal && localTracks.length === 0) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="folder-open-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.centerStateTitle}>No Local Music Found</Text>
          <Text style={styles.centerStateText}>
            Add music files to your device storage, or search iTunes above to
            listen to 30-second previews.
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <FlatList
          data={isLoading ? [] : displayTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrack}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: currentTrack ? 100 : 24 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* Persistent mini player */}
        <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    paddingBottom: 8,
  },
  // App header
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 6,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.accentLight,
    letterSpacing: 2,
    fontWeight: '500',
    marginTop: 1,
  },
  headerIconRow: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBarFocused: {
    borderColor: COLORS.accent,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  // Section
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Empty states
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  centerStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSec,
    textAlign: 'center',
  },
  centerStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
