import { create } from 'zustand';
import { YouTubeVideo } from '../lib/youtube';

type PlaybackMode = 'audio' | 'video';
type RepeatMode = 'none' | 'all' | 'one';
type ShuffleMode = boolean;

interface PlayerState {
  currentTrack: YouTubeVideo | null;
  isPlaying: boolean;
  volume: number;
  queue: YouTubeVideo[];
  history: YouTubeVideo[];
  recommendations: YouTubeVideo[];
  playbackMode: PlaybackMode;
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  setCurrentTrack: (track: YouTubeVideo | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  addToQueue: (track: YouTubeVideo) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setShuffleMode: (mode: ShuffleMode) => void;
  addToHistory: (track: YouTubeVideo) => void;
  setRecommendations: (tracks: YouTubeVideo[]) => void;
  addRecommendation: (track: YouTubeVideo) => void;
  clearHistory: () => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  queue: [],
  history: [],
  recommendations: [],
  playbackMode: 'audio',
  repeatMode: 'none',
  shuffleMode: false,
  
  setCurrentTrack: (track) => {
    const current = get().currentTrack;
    if (current) {
      get().addToHistory(current);
    }
    set({ currentTrack: track });
  },
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  
  addToQueue: (track) => set((state) => ({ 
    queue: [...state.queue, track],
    recommendations: state.recommendations.filter(t => t.id !== track.id)
  })),
  
  removeFromQueue: (trackId) => set((state) => ({
    queue: state.queue.filter((track) => track.id !== trackId),
  })),
  
  clearQueue: () => set({ queue: [] }),
  
  nextTrack: () => {
    const { currentTrack, queue, repeatMode, shuffleMode, recommendations } = get();
    if (queue.length === 0 && recommendations.length === 0) return;
    
    // Find current track index in queue
    const currentIndex = currentTrack 
      ? queue.findIndex(track => track.id === currentTrack.id)
      : -1;
    
    let nextTrack = null;
    
    if (repeatMode === 'one') {
      // Replay current track
      nextTrack = currentTrack;
    } else if (shuffleMode) {
      // Get random track from queue or recommendations
      const availableTracks = [...queue, ...recommendations];
      if (availableTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        nextTrack = availableTracks[randomIndex];
      }
    } else {
      // Normal sequential playback
      if (currentIndex < queue.length - 1) {
        // Next track in queue
        nextTrack = queue[currentIndex + 1];
      } else if (repeatMode === 'all' && queue.length > 0) {
        // Start queue over
        nextTrack = queue[0];
      } else if (recommendations.length > 0) {
        // Play from recommendations
        nextTrack = recommendations[0];
        // Add to queue and remove from recommendations
        get().addToQueue(nextTrack);
      }
    }
    
    if (nextTrack) {
      set({ currentTrack: nextTrack, isPlaying: true });
    }
  },
  
  previousTrack: () => {
    const { currentTrack, queue, history } = get();
    if (queue.length === 0 && history.length === 0) return;
    
    // Get the last played track from history
    const previousTrack = history[history.length - 1];
    
    if (previousTrack) {
      set({ 
        currentTrack: previousTrack,
        isPlaying: true,
        history: history.slice(0, -1)
      });
    }
  },
  
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  setShuffleMode: (shuffleMode) => set({ shuffleMode }),
  
  addToHistory: (track) => set((state) => ({
    history: [...state.history.slice(-19), track] // Keep last 20 tracks
  })),
  
  setRecommendations: (tracks) => set({ recommendations: tracks }),
  
  addRecommendation: (track) => set((state) => ({
    recommendations: [...state.recommendations, track]
  })),
  
  clearHistory: () => set({ history: [] }),
  
  moveQueueItem: (fromIndex: number, toIndex: number) => set((state) => {
    const newQueue = [...state.queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedItem);
    return { queue: newQueue };
  })
}));