import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../context/PlayerContext';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

const MiniPlayer = ({ onPress }) => {
  const { currentTrack, isPlaying, positionMs, durationMs, togglePlayPause, skipToNext } =
    usePlayer();
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[styles.wrapper, { marginBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        {/* Thin progress bar at very top */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.inner}>
          {/* Artwork */}
          {currentTrack.artwork ? (
            <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Ionicons name="musical-note" size={18} color={COLORS.accentLight} />
            </View>
          )}

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={26}
                color={COLORS.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={(e) => {
                e.stopPropagation();
                skipToNext();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="play-skip-forward" size={22} color={COLORS.textSec} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

export default memo(MiniPlayer);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: SPACING.md,
    right: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  blur: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(17, 17, 27, 0.95)' : undefined,
  },
  progressTrack: {
    height: 2,
    backgroundColor: COLORS.surface3,
    width: '100%',
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.md,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
  },
  artworkPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: COLORS.textSec,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
});
