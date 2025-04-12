import { create } from 'zustand';
import { YouTubeVideo } from '../lib/youtube';

type PlaybackMode = 'audio' | 'video';

interface PlayerState {
  currentTrack: YouTubeVideo | null;
  isPlaying: boolean;
  volume: number;
  queue: YouTubeVideo[];
  playbackMode: PlaybackMode;
  setCurrentTrack: (track: YouTubeVideo | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  addToQueue: (track: YouTubeVideo) => void;
  removeFromQueue: (trackId: string) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  queue: [],
  playbackMode: 'audio',
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (trackId) =>
    set((state) => ({
      queue: state.queue.filter((track) => track.id !== trackId),
    })),
  nextTrack: () => {
    const { currentTrack, queue } = get();
    if (queue.length === 0) return;
    
    // Find current track index in queue
    const currentIndex = currentTrack 
      ? queue.findIndex(track => track.id === currentTrack.id)
      : -1;
    
    // Get next track
    const nextIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
    const nextTrack = queue[nextIndex];
    
    if (nextTrack) {
      set({ currentTrack: nextTrack, isPlaying: true });
    }
  },
  previousTrack: () => {
    const { currentTrack, queue } = get();
    if (queue.length === 0) return;
    
    // Find current track index in queue
    const currentIndex = currentTrack 
      ? queue.findIndex(track => track.id === currentTrack.id)
      : -1;
    
    // Get previous track
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    
    if (prevTrack) {
      set({ currentTrack: prevTrack, isPlaying: true });
    }
  },
}));