import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const TrackItem = ({ track, isActive, isPlaying, onPress, index }) => {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={() => onPress(track, index)}
      activeOpacity={0.7}
    >
      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {track.artwork ? (
          <Image source={{ uri: track.artwork }} style={styles.artwork} />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <Ionicons name="musical-note" size={20} color={COLORS.accentLight} />
          </View>
        )}
        {isActive && (
          <View style={styles.artworkOverlay}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={16}
              color={COLORS.text}
            />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, isActive && styles.titleActive]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
          {track.isItunes && (
            <View style={styles.itunesBadge}>
              <Text style={styles.itunesBadgeText}>PREVIEW</Text>
            </View>
          )}
        </View>
      </View>

      {/* Duration */}
      <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
    </TouchableOpacity>
  );
};

export default memo(TrackItem);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginVertical: 2,
  },
  containerActive: {
    backgroundColor: COLORS.surface2,
  },
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginRight: SPACING.md,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  artworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSec,
    marginBottom: 3,
  },
  titleActive: {
    color: COLORS.accentLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  artist: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  itunesBadge: {
    backgroundColor: COLORS.accentGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  itunesBadgeText: {
    fontSize: 9,
    color: COLORS.accentLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 12,
    color: COLORS.textMuted,
    minWidth: 38,
    textAlign: 'right',
  },
});
