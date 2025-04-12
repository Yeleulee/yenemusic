import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume, Video, Music, AlertTriangle, Maximize, Minimize, Headphones, Youtube, ChevronUp, ChevronDown, Heart, Share, List, Repeat, Shuffle, Loader, MessageSquare, X, Home, Search, Library, Settings } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useRouter } from 'next/router';

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
    queue
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

  // Add router for navigation
  const router = useRouter();

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
    
    // Store current playback time
    lastPlaybackTime.current = youtubePlayerRef.current.getCurrentTime();
    
    // Start transition
    handleModeTransition();
    
    // Switch mode after short delay
    setTimeout(() => {
      const newMode = playbackMode === 'audio' ? 'video' : 'audio';
      setPlaybackMode(newMode);
      
      // Ensure playback continues from the same position
      setTimeout(() => {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(lastPlaybackTime.current, true);
          if (isPlaying) {
            youtubePlayerRef.current.playVideo();
          }
        }
      }, MODE_SWITCH_DELAY);
    }, MODE_SWITCH_DELAY);
  }, [playbackMode, setPlaybackMode, handleModeTransition, isPlaying]);

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
    setExpandedPlayer(!expandedPlayer);
  }, [expandedPlayer]);

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

  // Add navigation handler
  const handleNavigate = useCallback((path: string) => {
    if (expandedPlayer) {
      // Minimize player before navigation for better user experience
      setExpandedPlayer(false);
      // Small delay to allow animation to complete
      setTimeout(() => {
        router.push(path);
      }, 100);
    } else {
      router.push(path);
    }
  }, [expandedPlayer, router]);

  return (
    <div className={containerClasses} ref={playerContainerRef}>
      {/* Expanded player view */}
      {expandedPlayer ? (
        <div className="h-full flex flex-col">
          {/* Header with track info and close button */}
          <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 border-b border-[#282828]">
            <button 
              onClick={() => setExpandedPlayer(false)} 
              className="text-white p-2 hover:bg-[#282828] rounded-full touch-manipulation"
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="text-center flex-1 px-2 sm:px-4 max-w-[80%] truncate">
              <h3 className="text-white text-xs sm:text-sm md:text-base font-semibold truncate">{trackData.title}</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm truncate">{trackData.artist}</p>
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              <button className="text-gray-400 p-1 sm:p-2 hover:text-white hover:bg-[#282828] rounded-full">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => handleNavigate('/')} 
                className="text-gray-400 p-1 sm:p-2 hover:text-white hover:bg-[#282828] rounded-full"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            {/* Video player or album art with lyrics */}
            <div className="relative w-full max-w-xl flex flex-col items-center justify-center mb-4 sm:mb-6">
              {/* Video container */}
              {playbackMode === 'video' ? (
                <div 
                  id="youtube-player-visible" 
                  ref={videoContainerRef}
                  className={`w-full ${fullScreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'} overflow-hidden rounded-lg shadow-lg relative`}
                ></div>
              ) : (
                /* Audio mode with album art and lyrics */
                <div className="w-full flex flex-col items-center">
                  {/* Album art in audio mode */}
                  <div className="relative w-full max-w-[60vw] sm:max-w-xs md:max-w-sm mb-4">
                    <div className="relative cursor-pointer group">
                      <img 
                        src={trackData.albumArt || trackData.thumbnailUrl} 
                        alt={trackData.title} 
                        className="w-full aspect-square object-cover rounded-lg shadow-lg ring-2 ring-[#333] ring-opacity-50 transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://via.placeholder.com/400/121212/FFFFFF?text=No+Image';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300">
                        <button 
                          className="p-2 sm:p-3 bg-white bg-opacity-0 group-hover:bg-opacity-90 text-transparent group-hover:text-black rounded-full transition-all duration-300 transform scale-90 group-hover:scale-110"
                          onClick={togglePlaybackMode}
                          aria-label="Switch to video mode"
                        >
                          <Video className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
          </div>
        </div>

                    {/* Now playing indicator */}
                    <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-md">
                      <Headphones className="w-3 h-3 mr-1" />
                      <span>Now Playing</span>
                    </div>
                  </div>

                  {/* Track info in audio mode */}
                  <div className="mb-4 text-center">
                    <h3 className="text-white text-lg sm:text-xl font-bold">{trackData.title}</h3>
                    <p className="text-gray-400 text-sm sm:text-base">{trackData.artist}</p>
                  </div>

                  {/* Lyrics section with improved styling */}
                  <div className="w-full max-w-lg rounded-lg mt-2 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold text-sm sm:text-base flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" /> Lyrics
                      </h3>
                      <button 
                        className="text-gray-400 hover:text-white text-xs sm:text-sm font-medium bg-[#282828] hover:bg-[#333] px-2 py-1 rounded-md"
                        onClick={() => setShowLyrics(!showLyrics)}
                      >
                        {showLyrics ? "Hide" : "Show full lyrics"}
                      </button>
                    </div>
                    
                    {!lyricsFetched ? (
                      <div className="bg-[#181818] rounded-lg p-4 text-center">
                        <Loader className="w-6 h-6 text-white animate-spin mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Loading lyrics...</p>
                      </div>
                    ) : lyrics.length === 0 ? (
                      <div className="bg-[#181818] rounded-lg p-4 text-center">
                        <p className="text-gray-400 text-sm">No lyrics available for this track</p>
                      </div>
                    ) : showLyrics ? (
                      <div 
                        className="h-[30vh] sm:h-[35vh] overflow-y-auto pr-2 custom-scrollbar rounded-lg bg-[#181818] p-3 sm:p-4"
                        ref={lyricsContainerRef}
                      >
                        <div className="text-center space-y-6 pb-6">
                          {lyrics.map((lyric, index) => (
                            <div 
                              key={index}
                              data-lyric-index={index}
                              className={`transition-all duration-300 py-1 ${
                                index === currentLyricIndex 
                                  ? 'text-white text-base sm:text-lg font-semibold transform scale-110' 
                                  : 'text-gray-400 text-sm sm:text-base'
                              }`}
                            >
                              {lyric.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#181818] rounded-lg p-4 text-center">
                        {currentLyricIndex >= 0 && lyrics[currentLyricIndex] && (
                          <div className="text-white font-semibold text-base sm:text-lg mb-1 transition-opacity duration-500">
                            {lyrics[currentLyricIndex].text}
                          </div>
                        )}
                        {currentLyricIndex + 1 < lyrics.length && (
                          <div className="text-gray-400 text-sm transition-opacity duration-500">
                            {lyrics[currentLyricIndex + 1]?.text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* YouTube player for audio - hidden but still active */}
            <div id="youtube-player-hidden" className="hidden"></div>
            
            {/* Playback controls for expanded view */}
            <div className="w-full max-w-md px-2 sm:px-0">
              {/* Progress bar */}
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs text-gray-400 w-8 sm:w-10 text-right">{formatTime(currentTime)}</span>
                <div 
                  className="progress-bar w-full h-2 bg-gray-700 cursor-pointer rounded-full relative group"
                  onClick={handleProgressSeek}
                >
                  <div 
                    className="progress h-full bg-green-500 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{ left: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 w-8 sm:w-10">{formatTime(duration)}</span>
              </div>

              {/* Control buttons */}
              <div className="flex justify-center items-center space-x-2 sm:space-x-4 md:space-x-6 mb-3 sm:mb-4">
                <button 
                  className="text-gray-400 p-1 sm:p-2 hover:text-white transition-colors duration-200"
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  className="text-gray-400 p-1 sm:p-2 hover:text-white transition-colors duration-200"
                  onClick={handlePreviousTrack}
                  title="Previous track or restart"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
                  className="p-2 sm:p-3 md:p-4 bg-white text-black rounded-full hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={togglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
                </button>
                <button 
                  className="text-gray-400 p-1 sm:p-2 hover:text-white transition-colors duration-200"
                  onClick={handleNextTrack}
                  title="Next track"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
                <button 
                  className="text-gray-400 p-1 sm:p-2 hover:text-white transition-colors duration-200"
                  title="Repeat"
                >
                  <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

              {/* Additional controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button 
                    className={`p-1 sm:p-2 ${playbackMode === 'audio' ? 'text-white bg-[#282828] rounded-full' : 'text-gray-400'} hover:text-white`}
                    onClick={() => {
                      setPlaybackMode('audio');
                    }}
                  >
                    <Music className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button 
                    className={`p-1 sm:p-2 ${playbackMode === 'video' ? 'text-white bg-[#282828] rounded-full' : 'text-gray-400'} hover:text-white`}
                    onClick={() => {
                      setPlaybackMode('video');
                    }}
                  >
                    <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  {videoId && playbackMode === 'video' && (
                    <button 
                      className="p-1 sm:p-2 text-gray-400 hover:text-white"
                      onClick={toggleFullScreen}
                    >
                      {fullScreen ? <Minimize className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button className="p-1 sm:p-2 text-gray-400 hover:text-white">
                    <Share className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button className="p-1 sm:p-2 text-gray-400 hover:text-white">
                    <List className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <div className="flex items-center space-x-1">
                    <Volume className={`w-3 h-3 sm:w-4 sm:h-4 ${volume === 0 ? 'text-gray-600' : 'text-gray-400'}`} />
          <input
            type="range"
            min="0"
                      max="100"
                      value={volume * 100}
                      onChange={(e) => setVolume(parseFloat(e.target.value) / 100)}
                      className="w-12 sm:w-16 md:w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 sm:[&::-webkit-slider-thumb]:w-3 sm:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>
      </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Mini player (collapsed view)
        <div className="bg-[#181818] flex items-center px-2 sm:px-4 py-2 sm:py-3 rounded-md max-w-full">
          {/* Album art/thumbnail with larger touch area for mobile */}
          <div
            className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 rounded-md overflow-hidden cursor-pointer touch-manipulation"
            onClick={() => setExpandedPlayer(true)}
          >
            <img
              src={trackData.albumArt || trackData.thumbnailUrl || '/fallback-album-art.jpg'}
              alt={trackData.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://via.placeholder.com/300x300/121212/FFFFFF?text=No+Image';
              }}
            />
            {mediaError && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <span className="text-red-500 text-xs p-1 text-center">Error</span>
              </div>
            )}
          </div>
          
          {/* Track info - optimized for smaller screens */}
          <div className="mx-2 sm:mx-3 flex-1 min-w-0 touch-manipulation" onClick={() => setExpandedPlayer(true)}>
            <h3 className="text-white text-xs sm:text-sm md:text-base font-medium truncate">{trackData.title}</h3>
            <p className="text-gray-400 text-[10px] sm:text-xs truncate">{trackData.artist}</p>
          </div>
          
          {/* Controls - improved touch area and spacing for mobile */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
            <button 
              className="p-1.5 sm:p-2 md:p-3 text-white hover:bg-[#282828] rounded-full touch-manipulation transition-all duration-200"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            </button>
            
            <button 
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white touch-manipulation transition-all duration-200"
              onClick={handleNextTrack}
              aria-label="Next track"
            >
              <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            <div className="hidden sm:flex items-center space-x-1">
              <button 
                className={`p-1 sm:p-1.5 ${playbackMode === 'audio' ? 'text-white bg-[#282828]' : 'text-gray-400'} hover:text-white hover:bg-[#333] rounded-full touch-manipulation transition-all duration-200`}
                onClick={() => {
                  setPlaybackMode('audio');
                }}
                aria-label="Audio mode"
              >
                <Music className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button 
                className={`p-1 sm:p-1.5 ${playbackMode === 'video' ? 'text-white bg-[#282828]' : 'text-gray-400'} hover:text-white hover:bg-[#333] rounded-full touch-manipulation transition-all duration-200`}
                onClick={() => {
                  setPlaybackMode('video');
                  setExpandedPlayer(true);
                }}
                aria-label="Video mode"
              >
                <Video className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
            
            <button 
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full touch-manipulation transition-all duration-200"
              onClick={() => setExpandedPlayer(true)}
              aria-label="Expand player"
            >
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Display any errors */}
      {(mediaError || apiError) && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center">
          <div className="bg-red-900/80 text-white px-4 py-2 rounded-md text-sm flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>{mediaError || apiError}</span>
          </div>
        </div>
      )}
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