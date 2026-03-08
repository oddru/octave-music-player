import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Audio } from 'expo-av';

// ─── Types & Initial State ────────────────────────────────────────────────────

const PlayerContext = createContext(null);

const initialState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  repeatMode: 'none', // 'none' | 'all' | 'one'
  isShuffled: false,
  error: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function playerReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        currentTrack: action.payload.track,
        queue: action.payload.queue,
        currentIndex: action.payload.index,
        isLoading: true,
        error: null,
        positionMs: 0,
        durationMs: action.payload.track.durationMs || 0,
      };
    case 'LOAD_SUCCESS':
      return { ...state, isLoading: false };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, isPlaying: false, error: action.payload };
    case 'SET_PLAYBACK_STATUS':
      return {
        ...state,
        isPlaying: action.payload.isPlaying,
        positionMs: action.payload.positionMs,
        durationMs: action.payload.durationMs || state.durationMs,
      };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_TRACK_ARTWORK':
      if (!state.currentTrack || state.currentTrack.id !== action.payload.id) return state;
      return {
        ...state,
        currentTrack: { ...state.currentTrack, artwork: action.payload.artwork },
      };
    case 'CYCLE_REPEAT':
      const modes = ['none', 'all', 'one'];
      return {
        ...state,
        repeatMode: modes[(modes.indexOf(state.repeatMode) + 1) % 3],
      };
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffled: !state.isShuffled };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const soundRef = useRef(null);
  // Use a ref to always have access to current state inside callbacks/closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Configure audio session on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
    });
    return () => {
      // Cleanup sound on unmount
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Playback status callback (called by expo-av on every status update)
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return;

    dispatch({
      type: 'SET_PLAYBACK_STATUS',
      payload: {
        isPlaying: status.isPlaying,
        positionMs: status.positionMillis,
        durationMs: status.durationMillis,
      },
    });

    // Auto-advance when track finishes
    if (status.didJustFinish) {
      const { repeatMode, currentIndex, queue, isShuffled } = stateRef.current;

      if (repeatMode === 'one') {
        soundRef.current?.setPositionAsync(0).then(() => soundRef.current?.playAsync());
      } else {
        const atEnd = currentIndex >= queue.length - 1;
        if (!atEnd || repeatMode === 'all') {
          const nextIdx = isShuffled
            ? Math.floor(Math.random() * queue.length)
            : (currentIndex + 1) % queue.length;
          _loadTrackAtIndex(queue, nextIdx);
        }
      }
    }
  }, []);

  // ── Core internal loader
  const _loadTrackAtIndex = useCallback(async (queue, index) => {
    const track = queue[index];
    if (!track) return;

    dispatch({ type: 'LOAD_START', payload: { track, queue, index } });

    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      dispatch({ type: 'LOAD_SUCCESS' });
    } catch (err) {
      console.error('[PlayerContext] Load error:', err);
      dispatch({ type: 'LOAD_ERROR', payload: 'Failed to load track.' });
    }
  }, [onPlaybackStatusUpdate]);

  // ── Public API

  /** Play a track and set the queue */
  const loadAndPlay = useCallback(async (track, queue = [], index = 0) => {
    await _loadTrackAtIndex(queue.length > 0 ? queue : [track], index);
  }, [_loadTrackAtIndex]);

  const play = useCallback(async () => {
    await soundRef.current?.playAsync();
  }, []);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (stateRef.current.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [play, pause]);

  const seekTo = useCallback(async (millis) => {
    await soundRef.current?.setPositionAsync(millis);
  }, []);

  const skipToNext = useCallback(async () => {
    const { queue, currentIndex, isShuffled } = stateRef.current;
    if (queue.length === 0) return;
    const nextIdx = isShuffled
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;
    await _loadTrackAtIndex(queue, nextIdx);
  }, [_loadTrackAtIndex]);

  const skipToPrevious = useCallback(async () => {
    const { queue, currentIndex, positionMs } = stateRef.current;
    if (queue.length === 0) return;
    // If >3 seconds in, restart; otherwise go to previous
    if (positionMs > 3000) {
      await seekTo(0);
      return;
    }
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    await _loadTrackAtIndex(queue, prevIdx);
  }, [_loadTrackAtIndex, seekTo]);

  const cycleRepeat = useCallback(() => dispatch({ type: 'CYCLE_REPEAT' }), []);
  const toggleShuffle = useCallback(() => dispatch({ type: 'TOGGLE_SHUFFLE' }), []);

  /** Update artwork for the current track (called after iTunes metadata fetch) */
  const updateCurrentTrackArtwork = useCallback((id, artwork) => {
    dispatch({ type: 'UPDATE_TRACK_ARTWORK', payload: { id, artwork } });
  }, []);

  const value = {
    // State
    ...state,
    // Actions
    loadAndPlay,
    togglePlayPause,
    seekTo,
    skipToNext,
    skipToPrevious,
    cycleRepeat,
    toggleShuffle,
    updateCurrentTrackArtwork,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
