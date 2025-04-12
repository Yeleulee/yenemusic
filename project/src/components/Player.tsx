import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume, Video, Music, AlertTriangle, Maximize, Minimize, Headphones, Youtube, ChevronUp, ChevronDown, Heart, Share, List, Repeat, Shuffle, Loader, MessageSquare, X, Home, Search, Library, Settings, Volume1, Volume2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useNavigate } from 'react-router-dom';
import { getRecommendations } from '../lib/youtube';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { YouTube } from 'react-youtube';
import { Mic } from 'lucide-react';

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

// Add to the interface PlayerStore
interface PlayerStore {
  // ... existing properties ...
  recommendations: YouTubeVideo[];
  setRecommendations: (recommendations: YouTubeVideo[]) => void;
}

// Update the usePlayerStore hook
export const usePlayerStore = create<PlayerStore>((set) => ({
  // ... existing properties ...
  recommendations: [],
  setRecommendations: (recommendations) => set({ recommendations }),
}));

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
    setRecommendations
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

  // Update the handleNext function to include shuffle and repeat
  const handleNext = useCallback(() => {
    if (!youtubePlayerRef.current) return;

    if (isRepeat) {
      // Replay current track
      youtubePlayerRef.current.seekTo(0);
      youtubePlayerRef.current.playVideo();
      return;
    }

    if (isShuffle) {
      // Combine recommendations and queue, then pick random
      const allTracks = [...recommendations, ...queue];
      if (allTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * allTracks.length);
        const nextTrack = allTracks[randomIndex];
        setCurrentTrack(nextTrack);
        
        // Remove the track from its original array
        if (randomIndex < recommendations.length) {
          setRecommendations(recommendations.filter((_, i) => i !== randomIndex));
        } else {
          setQueue(queue.filter((_, i) => i !== (randomIndex - recommendations.length)));
        }
        return;
      }
    }

    // Default behavior
    if (recommendations.length > 0) {
      const nextTrack = recommendations[0];
      setCurrentTrack(nextTrack);
      setRecommendations(recommendations.slice(1));
      return;
    }

    if (queue.length > 0) {
      const nextTrack = queue[0];
      setCurrentTrack(nextTrack);
      setQueue(queue.slice(1));
      return;
    }

    // Get new recommendations if needed
    if (currentTrack) {
      getRecommendations(currentTrack).then((newRecommendations) => {
        if (newRecommendations.length > 0) {
          setCurrentTrack(newRecommendations[0]);
          setRecommendations(newRecommendations.slice(1));
        }
      });
    }
  }, [currentTrack, queue, recommendations, isRepeat, isShuffle, youtubePlayerRef]);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      isExpanded ? "h-[calc(100vh-4rem)]" : "h-20"
    )}>
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full h-full">
        <div className="flex-1 flex items-center justify-start px-4 space-x-4">
          {currentTrack && (
            <>
              <div 
                className="relative cursor-pointer group"
                onClick={togglePlaybackMode}
              >
                <img 
                  src={currentTrack.thumbnailUrl} 
                  alt={currentTrack.title}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  {playbackMode === 'audio' ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <Music className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm truncate max-w-[200px]">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentTrack.artist}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex-[2] flex flex-col items-center justify-center">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={cn(isShuffle && "text-primary")}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousTrack}
              disabled={!currentTrack}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={togglePlay}
              disabled={!currentTrack}
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
              onClick={handleNext}
              disabled={!currentTrack}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={cn(isRepeat && "text-primary")}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-full max-w-[600px] flex items-center space-x-2 px-4">
            <span className="text-xs w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleProgressSeek}
              className="flex-1"
            />
            <span className="text-xs w-12">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-end px-4 space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLyrics}
            disabled={!currentTrack}
          >
            <Mic className="h-5 w-5" />
          </Button>
          {playbackMode === 'audio' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlaybackMode}
              disabled={!currentTrack}
            >
              <Video className="h-5 w-5" />
            </Button>
          )}
          <div className="relative" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
            <Button
              variant="ghost"
              size="icon"
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-background/95 rounded-lg shadow-lg">
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
            onClick={toggleExpandPlayer}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex items-center justify-between w-full h-20 px-4">
        {currentTrack && (
          <>
            <div className="flex items-center space-x-3">
              <div 
                className="relative cursor-pointer group"
                onClick={togglePlaybackMode}
              >
                <img 
                  src={currentTrack.thumbnailUrl} 
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  {playbackMode === 'audio' ? (
                    <Video className="w-4 h-4 text-white" />
                  ) : (
                    <Music className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm truncate max-w-[150px]">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {currentTrack.artist}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Video Player Container */}
      {playbackMode === 'video' && isExpanded && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
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
          <div 
            id="youtube-player-visible" 
            className="w-full h-full"
            onClick={togglePlay}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex flex-col space-y-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={handleProgressSeek}
                className="w-full"
              />
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
                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
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
                </div>
              </div>
            </div>
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