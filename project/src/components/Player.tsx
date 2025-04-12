import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume, Video, Music, AlertTriangle, Maximize, Minimize, Headphones, Youtube, ChevronUp, ChevronDown, Heart, Share, List, Repeat, Shuffle, Loader, MessageSquare, X } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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

export const Player = () => {
  // Refs
  const youtubePlayerRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  
  // Player store
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    playbackMode,
    setIsPlaying, 
    setVolume,
    setPlaybackMode
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
    if (isPlaying && showLyrics) {
      const index = mockLyrics.findIndex((lyric, i) => {
        const nextLyric = mockLyrics[i + 1];
        if (nextLyric) {
          return currentTime >= lyric.time && currentTime < nextLyric.time;
        }
        return currentTime >= lyric.time;
      });
      
      if (index !== -1 && index !== currentLyricIndex) {
        setCurrentLyricIndex(index);
        // Scroll to active lyric
        if (lyricsContainerRef.current) {
          const lyricElement = lyricsContainerRef.current.querySelector(`[data-lyric-index="${index}"]`);
          lyricElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, isPlaying, showLyrics, currentLyricIndex]);

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

  // Initialize YouTube player when API is ready and video ID changes
  useEffect(() => {
    if (isYouTubeAPIReady && videoId && !youtubePlayerRef.current) {
      setPlayerReady(false);
      
      // Create container if not exists
      if (!document.getElementById('youtube-player-container')) {
        const container = document.createElement('div');
        container.id = 'youtube-player-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'absolute';
        document.body.appendChild(container);
      }

      // Initialize the player
      console.log("Creating YouTube player for video:", videoId);
      youtubePlayerRef.current = new window.YT.Player('youtube-player-container', {
        videoId: videoId,
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
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
    } else if (youtubePlayerRef.current && videoId) {
      // Just load a new video if player already exists
      try {
        youtubePlayerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: currentTimeRef.current
        });
        
        if (!isPlaying) {
          youtubePlayerRef.current.pauseVideo();
        }
      } catch (e) {
        console.error("Error loading new video:", e);
      }
    }

    function onPlayerReady(event: any) {
      console.log("YouTube player is ready");
      const player = event.target;
      
      // Set volume
      player.setVolume(volume * 100);
      
      // Position the iframe correctly
      const iframe = document.getElementById('youtube-player-container') as HTMLIFrameElement;
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1';
        
        // Move iframe to video container
        if (videoContainerRef.current && videoContainerRef.current.contains(iframe)) {
          console.log("Player already in container");
        } else if (videoContainerRef.current) {
          console.log("Moving player to container");
          videoContainerRef.current.appendChild(iframe);
        }
      }
      
      // Start progress tracking
      startProgressTracking(player);
      
      // Mark player as ready
      setPlayerReady(true);
      
      // Start playback if needed
      if (isPlaying) {
        player.playVideo();
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
  }, [isYouTubeAPIReady, videoId, volume, isPlaying, startProgressTracking]);

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
    handleModeTransition();
    setPlaybackMode(playbackMode === 'audio' ? 'video' : 'audio');
    
    // Hide lyrics when switching to video
    if (playbackMode === 'audio') {
      setShowLyrics(false);
    }
  }, [playbackMode, setPlaybackMode, handleModeTransition]);

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
    ${expandedPlayer ? 'top-0 bg-gradient-to-b from-[#121212] via-[#121212] to-[#181818] z-50' : 'bg-[#181818] border-t border-[#282828] z-30'} 
    transition-all duration-300 ease-in-out
  `;

  return (
    <div className={containerClasses}>
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
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            {/* Video player or album art */}
            <div className={`relative ${videoId ? 'w-full max-w-xl aspect-video' : 'w-full max-w-[70vw] sm:max-w-xs md:max-w-sm'} mb-4 sm:mb-6`}>
              {videoId ? (
                <div 
                  id="youtube-player-visible" 
                  className={`w-full ${fullScreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'} overflow-hidden rounded-lg shadow-lg`}
                ></div>
              ) : (
                <div 
                  className="relative cursor-pointer group" 
                  onClick={() => setExpandedPlayer(true)}
                >
                  <img 
                    src={trackData.albumArt || trackData.thumbnailUrl} 
                    alt={trackData.title} 
                    className="w-full aspect-square object-cover rounded-lg shadow-lg"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://via.placeholder.com/400/121212/FFFFFF?text=No+Image';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-lg">
                    <button className="p-2 sm:p-3 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all">
                      <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Playback controls for expanded view */}
            <div className="w-full max-w-md px-2 sm:px-0">
              {/* Progress bar */}
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs text-gray-400 w-8 sm:w-10 text-right">{formatTime(currentTime)}</span>
                <div 
                  className="progress-bar w-full h-1 bg-gray-700 cursor-pointer rounded-full"
                  onClick={handleProgressSeek}
                >
                  <div 
                    className="progress h-full bg-green-500 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 w-8 sm:w-10">{formatTime(duration)}</span>
              </div>
              
              {/* Control buttons */}
              <div className="flex justify-center items-center space-x-2 sm:space-x-4 md:space-x-6 mb-3 sm:mb-4">
                <button className="text-gray-400 p-1 sm:p-2 hover:text-white">
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="text-gray-400 p-1 sm:p-2 hover:text-white">
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  className="p-2 sm:p-3 md:p-4 bg-white text-black rounded-full hover:bg-gray-200 transform hover:scale-105 transition-all"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
                </button>
                <button className="text-gray-400 p-1 sm:p-2 hover:text-white">
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="text-gray-400 p-1 sm:p-2 hover:text-white">
                  <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Additional controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button 
                    className={`p-1 sm:p-2 ${playbackMode === 'audio' ? 'text-white' : 'text-gray-400'} hover:text-white`}
                    onClick={() => {
                      setPlaybackMode('audio');
                      setExpandedPlayer(false);
                    }}
                  >
                    <Music className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button 
                    className={`p-1 sm:p-2 ${playbackMode === 'video' ? 'text-white' : 'text-gray-400'} hover:text-white`}
                    onClick={() => {
                      setPlaybackMode('video');
                      setExpandedPlayer(true);
                    }}
                  >
                    <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  {videoId && (
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
          
          {/* Controls - increased touch area and spacing for mobile */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
            <button 
              className="p-1.5 sm:p-2 md:p-3 text-white hover:bg-[#282828] rounded-full touch-manipulation"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            </button>
            
            <div className="hidden sm:flex items-center space-x-1">
              <button 
                className={`p-1 sm:p-1.5 ${playbackMode === 'audio' ? 'text-white bg-[#282828]' : 'text-gray-400'} hover:text-white hover:bg-[#333] rounded-full touch-manipulation`}
                onClick={() => {
                  setPlaybackMode('audio');
                  setExpandedPlayer(false);
                }}
                aria-label="Audio mode"
              >
                <Music className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button 
                className={`p-1 sm:p-1.5 ${playbackMode === 'video' ? 'text-white bg-[#282828]' : 'text-gray-400'} hover:text-white hover:bg-[#333] rounded-full touch-manipulation`}
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
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white touch-manipulation"
              onClick={() => setExpandedPlayer(true)}
            >
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* YouTube player for audio only - hidden */}
      <div id="youtube-player-hidden" className="hidden"></div>
      
      {/* Hidden audio element for audio playback - removed since we use YouTube API */}
      {playbackMode === 'audio' && !isYouTubeAPIReady && currentTrack?.url && (
        <div className="hidden">
          {/* Fallback message when YouTube API fails */}
          {apiError && <p className="text-red-500 text-xs">{apiError}</p>}
        </div>
      )}
    </div>
  );
};