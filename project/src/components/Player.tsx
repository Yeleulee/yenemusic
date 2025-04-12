import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume, Video, Music, AlertTriangle, Maximize, Minimize, Headphones, Youtube, ChevronUp, ChevronDown, Heart, Share, List, Repeat, Shuffle, Loader, MessageSquare, X, Home, Search, Library, Settings, Volume1, Volume2, Plus, RotateCcw, RotateCw, SwitchHorizontal } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useNavigate } from 'react-router-dom';
import { getRecommendations } from '../lib/youtube';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { YouTube } from 'react-youtube';
import { Mic } from 'lucide-react';
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Canvas } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';

// Track preloading state
const PRELOAD_NEXT_TRACK = true;
const MODE_SWITCH_DELAY = 100;

// Sample lyrics data (in a real app, this would come from an API)
const mockLyrics = [
  { time: 0, text: "[Intro]" },
  { time: 5, text: "Living my life in a slow hell" },
  { time: 12, text: "Different day, same old shell" },
  { time: 18, text: "I've been waiting for a long time" },
  { time: 25, text: "For this moment to come" },
  { time: 32, text: "I'm destined for anything at all" },
  { time: 39, text: "Downed the cup of liquid pain" },
  { time: 46, text: "When you burn you can't feel the pain" },
  { time: 52, text: "'Cause you're done" },
  { time: 56, text: "So you stumble and you stagger" },
  { time: 62, text: "Down your crooked path" },
  { time: 68, text: "Seems that you have been blinded" },
  { time: 74, text: "By the darkness on your back" },
  { time: 80, text: "[Chorus]" },
  { time: 85, text: "But I'm here to say" },
  { time: 88, text: "That you're gonna be okay" },
  { time: 94, text: "You just need to trust me" },
  { time: 100, text: "And take my hand" },
  { time: 106, text: "Let's leave this broken world behind" },
  { time: 112, text: "And find a better place" },
  { time: 118, text: "Where the sun still shines" },
];

// Update the PlayerStore interface
interface PlayerStore {
  // ... existing properties ...
  history: YouTubeVideo[];
  playlists: { id: string; name: string; tracks: YouTubeVideo[] }[];
  addToHistory: (track: YouTubeVideo) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, track: YouTubeVideo) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
}

// Update the usePlayerStore hook
export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // ... existing properties ...
  history: [],
  playlists: [],
  addToHistory: (track) => set((state) => {
    const newHistory = [track, ...state.history.filter(t => t.id !== track.id)].slice(0, 50);
    return { history: newHistory };
  }),
  createPlaylist: (name) => set((state) => ({
    playlists: [...state.playlists, { id: Date.now().toString(), name, tracks: [] }]
  })),
  addToPlaylist: (playlistId, track) => set((state) => ({
    playlists: state.playlists.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, tracks: [...playlist.tracks, track] }
        : playlist
    )
  })),
  removeFromPlaylist: (playlistId, trackId) => set((state) => ({
    playlists: state.playlists.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, tracks: playlist.tracks.filter(t => t.id !== trackId) }
        : playlist
    )
  }))
}));

// Add visualization components
const AudioVisualizer = ({ isPlaying, volume }: { isPlaying: boolean; volume: number }) => {
  const bars = useMemo(() => Array.from({ length: 32 }, (_, i) => i), []);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <group position={[0, 0, 0]}>
          {bars.map((i) => (
            <AnimatedBar 
              key={i} 
              index={i} 
              isPlaying={isPlaying}
              volume={volume}
            />
          ))}
        </group>
      </Canvas>
    </div>
  );
};

const AnimatedBar = ({ index, isPlaying, volume }: { index: number; isPlaying: boolean; volume: number }) => {
  const position = [(index - 16) * 0.2, 0, 0];
  const maxHeight = 2 + Math.sin(index * 0.2) * 0.5;
  
  const { height } = useSpring({
    height: isPlaying ? maxHeight * Math.random() * volume : 0.1,
    config: {
      tension: 300,
      friction: 20,
    },
  });

  return (
    <animated.mesh position={position}>
      <boxGeometry args={[0.1, 1, 0.1]} />
      <animated.meshStandardMaterial 
        color={`hsl(${index * 8}, 70%, 50%)`}
        scale={[1, height, 1]}
      />
    </animated.mesh>
  );
};

// Add crossfade functionality
const CROSSFADE_DURATION = 3000; // 3 seconds

// Add animation variants
const slideUpVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }
};

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } }
};

// Add new styles at the top of the file
const styles = {
  container: "fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-[#282828]",
  playerWrapper: "flex flex-col h-full",
  mainContent: "flex items-center justify-between px-6 py-4",
  albumArt: "w-14 h-14 rounded-lg overflow-hidden cursor-pointer",
  trackInfo: "flex flex-col ml-4",
  trackTitle: "text-white font-medium text-sm hover:underline cursor-pointer",
  artistName: "text-[#b3b3b3] text-xs hover:text-white hover:underline cursor-pointer",
  controls: "flex items-center justify-center gap-8",
  controlButton: "text-[#b3b3b3] hover:text-white transition-colors",
  playButton: "w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition-transform",
  progressBar: "h-1 bg-[#4d4d4d] rounded-full relative group cursor-pointer",
  progressFill: "absolute h-full bg-[#1ed760] rounded-full",
  progressHandle: "absolute h-3 w-3 bg-white rounded-full -top-1 opacity-0 group-hover:opacity-100",
  volumeSlider: "h-24 flex items-center justify-center",
};

const Player: React.FC = () => {
  // Refs
  const youtubePlayerRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  const nextPlayerRef = useRef<any>(null);
  const lastPlaybackTime = useRef<number>(0);
  
  // Player store
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    playbackMode,
    setIsPlaying, 
    setVolume,
    setPlaybackMode,
    nextTrack,
    previousTrack,
    queue,
    recommendations,
    setRecommendations,
    history,
    playlists,
    addToHistory,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist
  } = usePlayerStore();
  
  // UI States
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [youtubePlayerInstance, setYoutubePlayerInstance] = useState<any>(null);
  const [lyrics, setLyrics] = useState<{time: number; text: string}[]>([]);
  const [lyricsFetched, setLyricsFetched] = useState(false);
  
  // Additional states for enhanced functionality
  const [nextTrackId, setNextTrackId] = useState<string | null>(null);
  const [isPreloadingNext, setIsPreloadingNext] = useState(false);
  const [recommendedTracks, setRecommendedTracks] = useState<any[]>([]);

  // Replace router with navigate
  const navigate = useNavigate();

  // Add new state variables after the existing ones
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  // Add new state variables
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(true);
  const crossfadeGainNode = useRef<GainNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // Add new state variables
  const [showHistory, setShowHistory] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  // Add new state for mobile player position
  const [mobilePlayerPosition, setMobilePlayerPosition] = useState({ x: 0, y: 0 });

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      // Load script only once
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      
      // Create callback if not already set
      if (!window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube IFrame API is ready');
          setIsYouTubeAPIReady(true);
        };
      }
    } else {
      setIsYouTubeAPIReady(true);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);

  // Update current lyrics based on time
  useEffect(() => {
    if (isPlaying && lyrics.length > 0) {
      const index = lyrics.findIndex((lyric, i) => {
        const nextLyric = lyrics[i + 1];
        if (nextLyric) {
          return currentTime >= lyric.time && currentTime < nextLyric.time;
        }
        return currentTime >= lyric.time;
      });
      
      if (index !== -1 && index !== currentLyricIndex) {
        setCurrentLyricIndex(index);
        // Scroll to active lyric
        if (lyricsContainerRef.current && showLyrics) {
          const lyricElement = lyricsContainerRef.current.querySelector(`[data-lyric-index="${index}"]`);
          lyricElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, isPlaying, lyrics, currentLyricIndex, showLyrics]);

  // Parse YouTube video ID from URL
  useEffect(() => {
    if (currentTrack?.url) {
      try {
        // Extract video ID from YouTube URL
        const url = new URL(currentTrack.url);
        const id = url.searchParams.get('v');
        
        if (id) {
          setVideoId(id);
          setMediaError(null);
          // Auto-expand player when a new track is loaded
          if (!expandedPlayer) {
            setExpandedPlayer(true);
          }
        } else {
          setApiError("Invalid YouTube URL format");
        }
      } catch (error) {
        console.error("Error parsing YouTube URL:", error);
        setApiError("Failed to parse YouTube URL");
      }
    } else {
      setVideoId(null);
    }
  }, [currentTrack, expandedPlayer]);

  // Create progress tracking interval
  const startProgressTracking = useCallback((player: any) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = window.setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function') {
        try {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          
          if (duration > 0) {
            setProgress((currentTime / duration) * 100);
            setCurrentTime(currentTime);
            currentTimeRef.current = currentTime;
            setDuration(duration);
          }
        } catch (e) {
          console.error("Error updating progress:", e);
        }
      }
    }, 250);
  }, []);

  // Clean up previous player if it exists
  const cleanupPreviousPlayer = useCallback(() => {
    // Remove any existing player divs
    const existingPlayer = document.getElementById('youtube-player-container');
    if (existingPlayer) {
      existingPlayer.remove();
    }
  }, []);

  // Initialize YouTube player when API is ready and video ID changes
  useEffect(() => {
    if (isYouTubeAPIReady && videoId) {
      setPlayerReady(false);
      
      // Clean up previous player to avoid conflicts
      cleanupPreviousPlayer();
      
      // Create container for the YouTube player
      const containerId = 'youtube-player-container';
      
      // Create a new div for the YouTube player
      const playerDiv = document.createElement('div');
      playerDiv.id = containerId;
      
      // Always attach to the hidden container first, we'll move it if needed
      const container = document.getElementById('youtube-player-hidden');
      if (container) {
        container.innerHTML = '';
        container.appendChild(playerDiv);
      }

      // Initialize the player
      console.log(`Creating YouTube player for video: ${videoId}`);
      
      const newPlayer = new window.YT.Player(containerId, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'autoplay': 1,
          'disablekb': 1,
          'modestbranding': 1,
          'rel': 0,
          'showinfo': 0,
          'iv_load_policy': 3,
          'fs': 0
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
      
      youtubePlayerRef.current = newPlayer;
      setYoutubePlayerInstance(newPlayer);
    }

    function onPlayerReady(event: any) {
      console.log("YouTube player is ready");
      const player = event.target;
      
      // Set volume
      player.setVolume(volume * 100);
      
      // Position the iframe correctly
      const iframe = document.querySelector('#youtube-player-container iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1';
        
        // Move iframe to the correct container based on playback mode
        if (playbackMode === 'video') {
          const videoContainer = document.getElementById('youtube-player-visible');
          if (videoContainer) {
            videoContainer.innerHTML = '';
            videoContainer.appendChild(iframe);
          }
        }
      }
      
      // Start progress tracking
      startProgressTracking(player);
      
      // Mark player as ready
      setPlayerReady(true);
      
      // Always start playback for better user experience
      setIsPlaying(true);
      player.playVideo();
      
      // Auto-fetch lyrics for this song
      if (currentTrack) {
        fetchLyricsForTrack(currentTrack.title, currentTrack.artist);
      }
    }

    function onPlayerStateChange(event: any) {
      const player = event.target;
      
      if (event.data === window.YT.PlayerState.PLAYING) {
        if (!isPlaying) setIsPlaying(true);
        startProgressTracking(player);
      } else if (event.data === window.YT.PlayerState.PAUSED) {
        if (isPlaying) setIsPlaying(false);
      } else if (event.data === window.YT.PlayerState.ENDED) {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
      }
    }

    function onPlayerError(event: any) {
      console.error("YouTube player error:", event);
      setMediaError("Failed to play this track. Please try another.");
      setIsPlaying(false);
      setPlayerReady(false);
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [isYouTubeAPIReady, videoId, volume, isPlaying, startProgressTracking, cleanupPreviousPlayer]);

  // Add effect to update player when playback mode changes
  useEffect(() => {
    if (youtubePlayerRef.current && playerReady) {
      const iframe = document.querySelector('#youtube-player-container iframe') as HTMLIFrameElement;
      if (iframe) {
        // Move the iframe to the correct container based on playback mode
        if (playbackMode === 'video') {
          const videoContainer = document.getElementById('youtube-player-visible');
          if (videoContainer) {
            videoContainer.innerHTML = '';
            videoContainer.appendChild(iframe);
          }
        } else {
          // For audio mode, keep it in the hidden container
          const audioContainer = document.getElementById('youtube-player-hidden');
          if (audioContainer && !audioContainer.contains(iframe)) {
            audioContainer.innerHTML = '';
            audioContainer.appendChild(iframe);
          }
        }
      }
    }
  }, [playbackMode, playerReady]);

  // Handle mode transition
  const handleModeTransition = useCallback(() => {
    setIsTransitioning(true);
    
    // Use a shorter timeout for faster transitions
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  // Toggle between audio and video modes
  const togglePlaybackMode = useCallback(() => {
    if (!youtubePlayerRef.current) return;
    
    const newMode = playbackMode === 'audio' ? 'video' : 'audio';
    setPlaybackMode(newMode);
    
    // Ensure playback continues from the same position
    const currentTime = youtubePlayerRef.current.getCurrentTime();
    setTimeout(() => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(currentTime, true);
      if (isPlaying) {
          youtubePlayerRef.current.playVideo();
        }
      }
    }, 100);
  }, [playbackMode, setPlaybackMode, isPlaying]);

  // Update YouTube player volume when volume changes
  useEffect(() => {
    if (youtubePlayerRef.current && playerReady) {
      try {
        youtubePlayerRef.current.setVolume(volume * 100);
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    }
  }, [volume, playerReady]);

  // Update player state based on isPlaying
  useEffect(() => {
    if (youtubePlayerRef.current && playerReady) {
      try {
      if (isPlaying) {
          youtubePlayerRef.current.playVideo();
      } else {
          youtubePlayerRef.current.pauseVideo();
        }
      } catch (e) {
        console.error("Error controlling playback:", e);
      }
    }
  }, [isPlaying, playerReady]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
      setIsPlaying(!isPlaying);
  }, [currentTrack, isPlaying, setIsPlaying]);

  const toggleFullScreen = useCallback(() => {
    if (playerContainerRef.current) {
      if (!fullScreen) {
        if (playerContainerRef.current.requestFullscreen) {
          playerContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
    setFullScreen(!fullScreen);
  }, [fullScreen]);

  const toggleExpandPlayer = useCallback(() => {
    if (expandedPlayer) {
      // When minimizing
      setExpandedPlayer(false);
      // Keep playing but switch to audio mode if in video mode
      if (playbackMode === 'video') {
        setPlaybackMode('audio');
        // Ensure the player continues from the same position
        const currentTime = youtubePlayerRef.current?.getCurrentTime() || 0;
        setTimeout(() => {
          if (youtubePlayerRef.current) {
            youtubePlayerRef.current.seekTo(currentTime, true);
            if (isPlaying) {
              youtubePlayerRef.current.playVideo();
            }
          }
        }, 100);
      }
    } else {
      // When expanding
      setExpandedPlayer(true);
    }
  }, [expandedPlayer, playbackMode, isPlaying]);

  const toggleLyrics = useCallback(() => {
    setShowLyrics(!showLyrics);
  }, [showLyrics]);

  // Progress bar handling
  const handleProgressSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const progressBar = e.currentTarget;
      const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
      const progressBarWidth = progressBar.clientWidth;
      const seekPercentage = (clickPosition / progressBarWidth) * 100;
      
      // Calculate new time based on percentage
      const newTime = (seekPercentage / 100) * duration;
      
      // Update progress visually
      setProgress(seekPercentage);
      
      // Seek in YouTube player
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      }
    },
    [duration, youtubePlayerRef]
  );
  
  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Fallback track data for when no track is playing
  const trackData = currentTrack || {
    title: "No track playing",
    artist: "Select a track to play",
    albumArt: "https://via.placeholder.com/60/0f0f0f/d93250",
    thumbnailUrl: "https://via.placeholder.com/60/0f0f0f/d93250",
    id: "mock",
    url: ""
  };

  // Update mobile responsive styles in the player container
  const containerClasses = `
    fixed bottom-0 left-0 right-0 
    ${expandedPlayer ? 'top-0 bg-gradient-to-b from-[#121212] via-[#121212] to-[#181818] z-40' : 'bg-[#181818] border-t border-[#282828] z-30'} 
    transition-all duration-300 ease-in-out
  `;

  // Preload next track
  useEffect(() => {
    if (PRELOAD_NEXT_TRACK && queue && queue.length > 0) {
      const nextTrackInQueue = queue[0];
      if (nextTrackInQueue?.url) {
        try {
          const url = new URL(nextTrackInQueue.url);
          const nextId = url.searchParams.get('v');
          if (nextId && nextId !== nextTrackId) {
            setNextTrackId(nextId);
            setIsPreloadingNext(true);
            
            // Initialize hidden player for next track
            if (isYouTubeAPIReady) {
              const containerId = 'next-player-container';
              const playerDiv = document.createElement('div');
              playerDiv.id = containerId;
              
              const container = document.getElementById('youtube-player-hidden');
              if (container) {
                container.appendChild(playerDiv);
                
                nextPlayerRef.current = new window.YT.Player(containerId, {
                  videoId: nextId,
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'autoplay': 0,
                    'disablekb': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'iv_load_policy': 3,
                    'fs': 0
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error("Error preloading next track:", error);
        }
      }
    }
  }, [queue, isYouTubeAPIReady, nextTrackId]);

  // Enhanced lyrics fetching and synchronization
  const fetchLyricsForTrack = async (title: string, artist: string) => {
    try {
      setLyricsFetched(false);
      
      // Clean up the title and artist
      const cleanedTitle = title.toLowerCase()
        .replace(/\(feat\..*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      
      const cleanedArtist = artist.toLowerCase().trim();
      
      // Attempt to fetch from a lyrics service (you would implement this)
      // For now, we'll use enhanced mock data with better timing
      let syncedLyrics = [];
      
      // Generate properly timed lyrics
      const lyricsData = await generateTimedLyrics(cleanedTitle, cleanedArtist);
      if (lyricsData && lyricsData.length > 0) {
        syncedLyrics = lyricsData;
      } else {
        // Fallback to generated lyrics with better timing
        syncedLyrics = generateFallbackLyrics(cleanedTitle, cleanedArtist);
      }
      
      setLyrics(syncedLyrics);
      setLyricsFetched(true);
      
      if (playbackMode === 'audio') {
        setShowLyrics(true);
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics([{ time: 0, text: "Lyrics unavailable for this track" }]);
      setLyricsFetched(true);
    }
  };

  // Enhanced next/previous track handling
  const handleNextTrack = useCallback(() => {
    if (queue && queue.length > 0) {
      // If we preloaded the next track, use it
      if (nextPlayerRef.current && nextTrackId) {
        const currentPlayer = youtubePlayerRef.current;
        youtubePlayerRef.current = nextPlayerRef.current;
        nextPlayerRef.current = currentPlayer;
        
        setVideoId(nextTrackId);
        nextTrack();
        
        // Start playback immediately
        youtubePlayerRef.current.playVideo();
      } else {
        nextTrack();
      }
    } else if (recommendedTracks.length > 0) {
      // Play from recommendations if queue is empty
      const nextRecommended = recommendedTracks[0];
      if (nextRecommended) {
        // Add to queue and play
        // You would implement this based on your queue management
      }
    }
  }, [nextTrack, queue, nextTrackId, recommendedTracks]);

  // Update the navigation handler
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Add this useEffect to fetch recommendations when track changes
  useEffect(() => {
    if (currentTrack) {
      getRecommendations(currentTrack).then(setRecommendations);
    }
  }, [currentTrack]);

  // Add volume control functions
  const handleVolumeChange = useCallback((value: number) => {
    const newVolume = value / 100;
    setVolume(newVolume);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(value);
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (youtubePlayerRef.current) {
      if (!isMuted) {
        youtubePlayerRef.current.setVolume(0);
        setIsMuted(true);
      } else {
        youtubePlayerRef.current.setVolume(volume * 100);
        setIsMuted(false);
      }
    }
  }, [isMuted, volume]);

  // Add shuffle and repeat functions
  const toggleShuffle = useCallback(() => {
    setIsShuffle(!isShuffle);
  }, [isShuffle]);

  const toggleRepeat = useCallback(() => {
    setIsRepeat(!isRepeat);
  }, [isRepeat]);

  // Update the handleNext function to include crossfade
  const handleNext = useCallback(() => {
    if (currentTrack) {
      addToHistory(currentTrack);
    }
    if (!youtubePlayerRef.current) return;

    const startCrossfade = () => {
      if (crossfadeEnabled && crossfadeGainNode.current) {
        // Start fade out
        crossfadeGainNode.current.gain.linearRampToValueAtTime(
          0,
          audioContext.current!.currentTime + CROSSFADE_DURATION / 1000
        );
        
        // After fade out, play next track
        setTimeout(() => {
          if (isRepeat) {
            youtubePlayerRef.current?.seekTo(0);
            youtubePlayerRef.current?.playVideo();
          } else if (isShuffle) {
            // ... existing shuffle logic ...
          } else {
            // ... existing next track logic ...
          }
          
          // Reset gain for next track
          if (crossfadeGainNode.current) {
            crossfadeGainNode.current.gain.setValueAtTime(1, audioContext.current!.currentTime);
          }
        }, CROSSFADE_DURATION);
      } else {
        // Immediate switch without crossfade
        if (isRepeat) {
          youtubePlayerRef.current?.seekTo(0);
          youtubePlayerRef.current?.playVideo();
        } else if (isShuffle) {
          // ... existing shuffle logic ...
        } else {
          // ... existing next track logic ...
        }
      }
    };

    startCrossfade();
  }, [crossfadeEnabled, isRepeat, isShuffle, currentTrack, addToHistory]);

  // Add toggle functions
  const toggleQueue = useCallback(() => {
    setShowQueue(!showQueue);
    if (!showQueue) {
      setShowPlaylist(false);
    }
  }, [showQueue]);

  const togglePlaylist = useCallback(() => {
    setShowPlaylist(!showPlaylist);
    if (!showPlaylist) {
      setShowQueue(false);
    }
  }, [showPlaylist]);

  // Add toggle function for history
  const toggleHistory = useCallback(() => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      setShowQueue(false);
      setShowPlaylist(false);
    }
  }, [showHistory]);

  // Add keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'k':
          togglePlay();
          break;
        case 'j':
          // Rewind 10 seconds
          if (youtubePlayerRef.current) {
            const newTime = Math.max(0, currentTime - 10);
            youtubePlayerRef.current.seekTo(newTime, true);
          }
          break;
        case 'l':
          // Forward 10 seconds
          if (youtubePlayerRef.current) {
            const newTime = Math.min(duration, currentTime + 10);
            youtubePlayerRef.current.seekTo(newTime, true);
          }
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          if (playbackMode === 'video' && isExpanded) {
            toggleFullScreen();
          }
          break;
        case 'escape':
          if (playbackMode === 'video' && isExpanded) {
            toggleExpandPlayer();
          }
          break;
        case 'arrowup':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleVolumeChange(Math.min(100, (volume * 100) + 10));
          }
          break;
        case 'arrowdown':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleVolumeChange(Math.max(0, (volume * 100) - 10));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, currentTime, duration, volume, playbackMode, isExpanded, toggleMute, toggleFullScreen, toggleExpandPlayer, handleVolumeChange]);

  // Add double click handler for video fullscreen
  const handleVideoDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (playbackMode === 'video' && isExpanded) {
      toggleFullScreen();
    }
  }, [playbackMode, isExpanded, toggleFullScreen]);

  // Add mini player toggle function
  const toggleMiniPlayer = useCallback(() => {
    if (playbackMode === 'video') {
      setPlaybackMode('audio');
    }
    setIsMiniPlayer(!isMiniPlayer);
  }, [isMiniPlayer, playbackMode]);

  // Initialize audio context and gain node
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      crossfadeGainNode.current = audioContext.current.createGain();
      crossfadeGainNode.current.connect(audioContext.current.destination);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className={styles.playerWrapper}>
          <div className={styles.mainContent}>
            {/* Left Section - Track Info */}
            <div className="flex items-center min-w-[180px] max-w-[30%]">
              {currentTrack && (
                <motion.div 
                  className="flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className={styles.albumArt}>
                    <img 
                      src={currentTrack.thumbnailUrl} 
            alt={currentTrack.title}
                      className="w-full h-full object-cover"
          />
          </div>
                  <div className={styles.trackInfo}>
                    <span className={styles.trackTitle}>{currentTrack.title}</span>
                    <span className={styles.artistName}>{currentTrack.artist}</span>
                  </div>
                  <motion.button
                    className="ml-4 text-[#b3b3b3] hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart className="h-5 w-5" />
                  </motion.button>
                </motion.div>
              )}
        </div>

            {/* Center Section - Player Controls */}
            <div className="flex flex-col items-center max-w-[45%] w-full">
              <div className={styles.controls}>
                <motion.button
                  className={cn(styles.controlButton, isShuffle && "text-[#1ed760]")}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleShuffle}
                >
                  <Shuffle className="h-4 w-4" />
                </motion.button>
                <motion.button
                  className={styles.controlButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePreviousTrack}
                >
                  <SkipBack className="h-5 w-5" />
                </motion.button>
                <motion.button
                  className={styles.playButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
          >
            {isPlaying ? (
                    <Pause className="h-5 w-5 text-black" />
                  ) : (
                    <Play className="h-5 w-5 text-black ml-0.5" />
                  )}
                </motion.button>
                <motion.button
                  className={styles.controlButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                >
                  <SkipForward className="h-5 w-5" />
                </motion.button>
                <motion.button
                  className={cn(styles.controlButton, isRepeat && "text-[#1ed760]")}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRepeat}
                >
                  <Repeat className="h-4 w-4" />
                </motion.button>
        </div>

              {/* Progress Bar */}
              <div className="w-full flex items-center gap-2 mt-2 px-4">
                <span className="text-xs text-[#b3b3b3] w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="relative flex-1">
                  <div 
                    className={styles.progressBar}
                    onClick={handleProgressSeek}
                  >
                    <motion.div 
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                    <motion.div 
                      className={styles.progressHandle}
                      style={{ left: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-[#b3b3b3] w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right Section - Additional Controls */}
            <div className="flex items-center justify-end min-w-[180px] max-w-[30%]">
              <div className="flex items-center gap-4">
                <motion.button
                  className={styles.controlButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleLyrics}
                >
                  <Mic className="h-4 w-4" />
                </motion.button>
                <motion.button
                  className={styles.controlButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleQueue}
                >
                  <List className="h-4 w-4" />
                </motion.button>
                <div 
                  className="relative"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <motion.button
                    className={styles.controlButton}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleMute}
                  >
                    {isMuted || volume === 0 ? (
                      <Volume className="h-4 w-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {showVolumeSlider && (
                      <motion.div 
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#282828] rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <div className={styles.volumeSlider}>
          <input
            type="range"
            min="0"
                            max="100"
                            value={isMuted ? 0 : volume * 100}
                            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                            className="volume-slider"
                            style={{
                              WebkitAppearance: 'slider-vertical',
                              writingMode: 'bt-lr',
                              width: '6px',
                              height: '100%',
                              background: '#4d4d4d',
                              borderRadius: '3px',
                            }}
          />
        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
      </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className={cn(
        "md:hidden fixed transition-all duration-300 ease-in-out",
        isMiniPlayer 
          ? "w-[280px] rounded-xl shadow-2xl bottom-20 right-4 z-50 bg-[#282828]"
          : "bottom-0 left-0 right-0 bg-[#121212] border-t border-[#282828]"
      )}>
        {currentTrack && (
          <motion.div 
            className={cn("p-4", isMiniPlayer && "p-3")}
            drag={isMiniPlayer}
            dragConstraints={{
              top: 0,
              left: 0,
              right: window.innerWidth - 280,
              bottom: window.innerHeight - 100
            }}
            dragMomentum={false}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              setMobilePlayerPosition({
                x: mobilePlayerPosition.x + info.offset.x,
                y: mobilePlayerPosition.y + info.offset.y
              });
            }}
            animate={isMiniPlayer ? {
              x: mobilePlayerPosition.x,
              y: mobilePlayerPosition.y
            } : {
              x: 0,
              y: 0
            }}
          >
            <div className="flex items-center gap-4">
              <motion.div 
                className={cn("relative rounded-lg overflow-hidden", 
                  isMiniPlayer ? "w-12 h-12" : "w-14 h-14"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img 
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <motion.h3 
                  className={cn(
                    "text-white font-medium truncate",
                    isMiniPlayer ? "text-sm" : "text-base"
                  )}
                  whileHover={{ scale: 1.02 }}
                >
                  {currentTrack.title}
                </motion.h3>
                <motion.p 
                  className={cn(
                    "text-[#b3b3b3] truncate",
                    isMiniPlayer ? "text-xs" : "text-sm"
                  )}
                  whileHover={{ scale: 1.02 }}
                >
                  {currentTrack.artist}
                </motion.p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  className="text-white p-2 rounded-full"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className={isMiniPlayer ? "h-4 w-4" : "h-5 w-5"} />
                  ) : (
                    <Play className={isMiniPlayer ? "h-4 w-4" : "h-5 w-5"} />
                  )}
                </motion.button>
                {!isMiniPlayer && (
                  <motion.button
                    className="text-white p-2 rounded-full"
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                  >
                    <SkipForward className="h-5 w-5" />
                  </motion.button>
                )}
                <motion.button
                  className="text-white p-2 rounded-full"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMiniPlayer}
                >
                  {isMiniPlayer ? (
                    <Maximize className="h-4 w-4" />
                  ) : (
                    <Minimize className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Progress Bar - Only show in full mode */}
            {!isMiniPlayer && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#b3b3b3] w-[40px] text-right select-none">
                    {formatTime(currentTime)}
                  </span>
                  <div className="relative flex-1 group">
                    <div 
                      className="absolute w-full h-1 rounded-full bg-[#4d4d4d] cursor-pointer"
                      onClick={handleProgressSeek}
                    >
                      <motion.div 
                        className="absolute h-full bg-[#1ed760] rounded-full"
                        style={{ width: `${progress}%` }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                      <motion.div 
                        className="absolute h-3 w-3 bg-white rounded-full -top-1 opacity-0 group-hover:opacity-100"
                        style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[#b3b3b3] w-[40px] select-none">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Additional Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.button
                      className={cn(
                        "text-[#b3b3b3] hover:text-white p-2 rounded-full",
                        isShuffle && "text-[#1ed760]"
                      )}
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleShuffle}
                    >
                      <Shuffle className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      className={cn(
                        "text-[#b3b3b3] hover:text-white p-2 rounded-full",
                        isRepeat && "text-[#1ed760]"
                      )}
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleRepeat}
                    >
                      <Repeat className="h-4 w-4" />
                    </motion.button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <motion.button
                      className="text-[#b3b3b3] hover:text-white p-2 rounded-full"
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleLyrics}
                    >
                      <Mic className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      className={cn(
                        "text-[#b3b3b3] hover:text-white p-2 rounded-full",
                        showQueue && "text-[#1ed760]"
                      )}
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleQueue}
                    >
                      <List className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Video Player Container */}
      {playbackMode === 'video' && isExpanded && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent opacity-100 transition-opacity duration-300 hover:opacity-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={togglePlaybackMode}
                >
                  <Music className="h-5 w-5" />
                </Button>
                <div className="text-white">
                  <div className="font-medium">{currentTrack?.title}</div>
                  <div className="text-sm opacity-80">{currentTrack?.artist}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullScreen}
                >
                  {fullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleExpandPlayer}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          <div 
            id="youtube-player-visible" 
            className="w-full h-full cursor-pointer"
            onClick={togglePlay}
            onDoubleClick={handleVideoDoubleClick}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-100 transition-opacity duration-300 hover:opacity-100">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={handleProgressSeek}
                  className="flex-1"
                />
                <span className="text-white text-sm">
                  {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => {
                      if (youtubePlayerRef.current) {
                        const newTime = Math.max(0, currentTime - 10);
                        youtubePlayerRef.current.seekTo(newTime, true);
                      }
                    }}
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span className="absolute text-xs">10</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => {
                      if (youtubePlayerRef.current) {
                        const newTime = Math.min(duration, currentTime + 10);
                        youtubePlayerRef.current.seekTo(newTime, true);
                      }
                    }}
                  >
                    <RotateCw className="h-5 w-5" />
                    <span className="absolute text-xs">10</span>
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <Volume className="h-5 w-5" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    {showVolumeSlider && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/80 rounded-lg">
                        <Slider
                          orientation="vertical"
                          value={[isMuted ? 0 : volume * 100]}
                          max={100}
                          step={1}
                          className="h-24"
                          onValueChange={(value) => handleVolumeChange(value[0])}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleQueue}
                  >
                    <List className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Queue/Playlist/History Panel */}
      {isExpanded && (showQueue || showPlaylist || showHistory) && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-background/95 border-l border-border/40 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className={cn(showQueue && "text-primary")}
                onClick={toggleQueue}
              >
                Queue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(showPlaylist && "text-primary")}
                onClick={togglePlaylist}
              >
                Playlists
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(showHistory && "text-primary")}
                onClick={toggleHistory}
              >
                History
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowQueue(false);
                setShowPlaylist(false);
                setShowHistory(false);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {showQueue && (
              <div className="space-y-2">
                {/* Current Track */}
                {currentTrack && (
                  <div className="p-2">
                    <div className="text-sm font-medium text-muted-foreground mb-4">Now Playing</div>
                    <div className="flex items-center space-x-3">
                      <img 
                        src={currentTrack.thumbnailUrl} 
                        alt={currentTrack.title}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{currentTrack.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{currentTrack.artist}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Queue List */}
                <div className="border-t border-border/40 pt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Next Up</div>
                  <Reorder.Group 
                    axis="y" 
                    values={queue} 
                    onReorder={setQueue}
                    className="space-y-1"
                  >
                    {queue.map((track) => (
                      <Reorder.Item
                        key={track.id}
                        value={track}
                        dragListener={false}
                        dragControls={dragControls}
                      >
                        <div className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-md group">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onPointerDown={(e) => dragControls.start(e)}
                          >
                            <DragHandleDots2Icon className="h-4 w-4" />
                          </Button>
                          <img 
                            src={track.thumbnailUrl} 
                            alt={track.title}
                            className="w-10 h-10 rounded-md object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{track.title}</div>
                            <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              setQueue(queue.filter(t => t.id !== track.id));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="border-t border-border/40 pt-4 mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Recommended</div>
                    {recommendations.map((track) => (
                      <div 
                        key={track.id} 
                        className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-md group cursor-pointer"
                        onClick={() => {
                          setCurrentTrack(track);
                          setRecommendations(recommendations.filter(t => t.id !== track.id));
                        }}
                      >
                        <img 
                          src={track.thumbnailUrl} 
                          alt={track.title}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{track.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQueue([...queue, track]);
                            setRecommendations(recommendations.filter(t => t.id !== track.id));
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {showPlaylist && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-2">
                  <input
                    type="text"
                    placeholder="New playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-accent/50"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (newPlaylistName.trim()) {
                        createPlaylist(newPlaylistName.trim());
                        setNewPlaylistName('');
                      }
                    }}
                  >
                    Create
                  </Button>
                </div>
                
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="space-y-2">
                    <div
                      className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-md cursor-pointer"
                      onClick={() => setSelectedPlaylist(selectedPlaylist === playlist.id ? null : playlist.id)}
                    >
                      <span className="font-medium">{playlist.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {playlist.tracks.length} tracks
                      </span>
                    </div>
                    
                    {selectedPlaylist === playlist.id && (
                      <div className="pl-4 space-y-1">
                        {playlist.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-md group"
                          >
                            <img
                              src={track.thumbnailUrl}
                              alt={track.title}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{track.title}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {track.artist}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => removeFromPlaylist(playlist.id, track.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {showHistory && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Recently Played
                </div>
                {history.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-md group cursor-pointer"
                    onClick={() => {
                      setCurrentTrack(track);
                      setIsPlaying(true);
                    }}
                  >
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQueue([...queue, track]);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <div id="youtube-player-hidden" className="hidden" />
    </div>
  );
};

// Helper function to generate timed lyrics
const generateTimedLyrics = async (title: string, artist: string) => {
  // In a real app, this would call a lyrics service API
  // For now, return null to use fallback
  return null;
};

// Helper function to generate fallback lyrics with better timing
const generateFallbackLyrics = (title: string, artist: string) => {
  const lyrics = [];
  const lines = [
    "Verse 1",
    title,
    "By " + artist,
    "Music flows through the night",
    "Bringing rhythm and light",
    "Chorus",
    "Let the melody play",
    "Taking us far away",
    "Verse 2",
    "Time stands still in this song",
    "As we all sing along"
  ];
  
  // Generate lyrics with proper timing
  lines.forEach((line, index) => {
    lyrics.push({
      time: index * 12, // 12 seconds per line for more natural timing
      text: line,
      duration: 10 // Duration each line should be displayed
    });
  });
  
  return lyrics;
};

export default Player;