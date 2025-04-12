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
}

export const usePlayerStore = create<PlayerState>((set) => ({
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
}));