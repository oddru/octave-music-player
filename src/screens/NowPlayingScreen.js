import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { usePlayer } from '../context/PlayerContext';
import { useItunesSearch } from '../hooks/useItunesSearch';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH * 0.75;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMs = (ms) => {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── Custom Seek Bar ──────────────────────────────────────────────────────────

const SeekBar = ({ position, duration, onSeek }) => {
  const [barWidth, setBarWidth] = useState(0);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  const handlePress = (e) => {
    if (barWidth <= 0) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    onSeek(ratio * duration);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.seekBarTouchable}
    >
      <View
        style={styles.seekBarTrack}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.seekBarThumb, { left: `${progress * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NowPlayingScreen({ navigation }) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    repeatMode,
    isShuffled,
    togglePlayPause,
    seekTo,
    skipToNext,
    skipToPrevious,
    cycleRepeat,
    toggleShuffle,
    updateCurrentTrackArtwork,
  } = usePlayer();

  const { fetchMetadataForLocalTrack } = useItunesSearch();
  const [fetchingArt, setFetchingArt] = useState(false);

  // Artwork pulse animation when loading
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Artwork scale-up when track changes
  const artScaleAnim = useRef(new Animated.Value(0.85)).current;

  // Animate artwork in on track change
  useEffect(() => {
    if (currentTrack) {
      Animated.spring(artScaleAnim, {
        toValue: isPlaying ? 1 : 0.85,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    Animated.spring(artScaleAnim, {
      toValue: isPlaying ? 1 : 0.85,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [isPlaying]);

  // Fetch iTunes artwork for local tracks
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.isItunes || currentTrack.artwork) return;

    let cancelled = false;
    setFetchingArt(true);
    fetchMetadataForLocalTrack(currentTrack.title, currentTrack.artist).then((meta) => {
      if (!cancelled && meta?.artwork) {
        updateCurrentTrackArtwork(currentTrack.id, meta.artwork);
      }
      if (!cancelled) setFetchingArt(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar style="light" />
        <Ionicons name="musical-notes-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Nothing playing yet</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go to Library</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const repeatIcon =
    repeatMode === 'one' ? 'repeat' : repeatMode === 'all' ? 'repeat' : 'repeat-outline';
  const repeatColor =
    repeatMode !== 'none' ? COLORS.accentLight : COLORS.textMuted;

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />

      {/* Blurred background artwork */}
      {currentTrack.artwork ? (
        <ImageBackground
          source={{ uri: currentTrack.artwork }}
          style={StyleSheet.absoluteFill}
          blurRadius={28}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={['#1A0E30', '#08080E', '#0D0D1E']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-down" size={28} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>NOW PLAYING</Text>
            {currentTrack.isItunes && (
              <View style={styles.previewPill}>
                <Ionicons name="logo-apple" size={10} color={COLORS.accentLight} />
                <Text style={styles.previewPillText}>30s PREVIEW</Text>
              </View>
            )}
          </View>

          <View style={styles.headerBtn} />
        </View>

        {/* ── Artwork ── */}
        <View style={styles.artworkSection}>
          <Animated.View
            style={[
              styles.artworkShadow,
              { transform: [{ scale: artScaleAnim }] },
            ]}
          >
            {currentTrack.artwork ? (
              <Image
                source={{ uri: currentTrack.artwork }}
                style={styles.artworkImage}
              />
            ) : (
              <View style={styles.artworkFallback}>
                <LinearGradient
                  colors={[COLORS.surface2, COLORS.surface3]}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="musical-note" size={72} color={COLORS.accentLight} />
                {fetchingArt && (
                  <Text style={styles.fetchingText}>Finding artwork…</Text>
                )}
              </View>
            )}
          </Animated.View>
        </View>

        {/* ── Track Info ── */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
          {currentTrack.album ? (
            <Text style={styles.trackAlbum} numberOfLines={1}>
              {currentTrack.album}
            </Text>
          ) : null}
        </View>

        {/* ── Seek Bar ── */}
        <View style={styles.seekSection}>
          <SeekBar
            position={positionMs}
            duration={durationMs}
            onSeek={seekTo}
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatMs(positionMs)}</Text>
            <Text style={styles.timeText}>{formatMs(durationMs)}</Text>
          </View>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          {/* Shuffle */}
          <TouchableOpacity onPress={toggleShuffle} style={styles.sideControl}>
            <Ionicons
              name="shuffle"
              size={22}
              color={isShuffled ? COLORS.accentLight : COLORS.textMuted}
            />
            {isShuffled && <View style={styles.activeDot} />}
          </TouchableOpacity>

          {/* Skip back */}
          <TouchableOpacity onPress={skipToPrevious} style={styles.skipControl}>
            <Ionicons name="play-skip-back" size={36} color={COLORS.text} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.playButton}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[COLORS.accentLight, COLORS.accent]}
              style={styles.playButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
                size={32}
                color={COLORS.text}
                style={isPlaying ? {} : { marginLeft: 3 }}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip forward */}
          <TouchableOpacity onPress={skipToNext} style={styles.skipControl}>
            <Ionicons name="play-skip-forward" size={36} color={COLORS.text} />
          </TouchableOpacity>

          {/* Repeat */}
          <TouchableOpacity onPress={cycleRepeat} style={styles.sideControl}>
            <Ionicons name={repeatIcon} size={22} color={repeatColor} />
            {repeatMode === 'one' && (
              <Text style={styles.repeatOneLabel}>1</Text>
            )}
            {repeatMode !== 'none' && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </View>

        {/* ── Queue hint ── */}
        <View style={styles.footer}>
          <Ionicons name="list-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.footerText}>Swipe down to return to library</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSec,
    fontSize: 16,
  },
  backBtn: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  backBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSec,
    letterSpacing: 2,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accentGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  previewPillText: {
    fontSize: 9,
    color: COLORS.accentLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Artwork
  artworkSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  artworkShadow: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  artworkImage: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: RADIUS.xl,
  },
  artworkFallback: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: SPACING.sm,
  },
  fetchingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Track info
  trackInfo: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.lg,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: COLORS.textSec,
    textAlign: 'center',
  },
  trackAlbum: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Seek bar
  seekSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  seekBarTouchable: {
    paddingVertical: 12,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    position: 'relative',
  },
  seekBarFill: {
    height: 4,
    backgroundColor: COLORS.accentLight,
    borderRadius: 2,
  },
  seekBarThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.text,
    marginLeft: -8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sideControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipControl: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  playButtonGradient: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accentLight,
    marginTop: 2,
  },
  repeatOneLabel: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.accentLight,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: SPACING.md,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
