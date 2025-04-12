import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPopularMusic, searchMusic, getGenreMusic, YouTubeVideo } from '../lib/youtube';
import { Search, Plus, Clock, Disc, Play, Music, Headphones, Video, AlertCircle, Eye, ListMusic, Flame, CheckCircle } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { SearchBar } from '../components/SearchBar';

// Mock data for playlists
const playlists = [
  { id: 'high-distortion', name: 'High Distortion', trackCount: 45, duration: '95 mins', color: 'from-red-600 to-red-800' },
  { id: 'easy-breezy', name: 'Easy Breezy Beats', trackCount: 23, duration: '40 mins', color: 'from-blue-500 to-blue-700' },
  { id: 'mellow-moments', name: 'Mellow Moments', trackCount: 18, duration: '35 mins', color: 'from-green-500 to-green-700' },
  { id: 'laid-back', name: 'Laid-Back Grooves', trackCount: 45, duration: '85 mins', color: 'from-purple-500 to-purple-800' },
  { id: 'sunset-song', name: 'Sunset Song', trackCount: 32, duration: '48 mins', color: 'from-orange-500 to-orange-700' }
];

// Popular genres for music discovery
const genres = [
  { id: 'pop', name: 'Pop', color: 'bg-[#7B2CBF]' },
  { id: 'rock', name: 'Rock', color: 'bg-[#7B2CBF]' },
  { id: 'hiphop', name: 'Hip Hop', color: 'bg-[#7B2CBF]' },
  { id: 'rnb', name: 'R&B', color: 'bg-[#7B2CBF]' },
  { id: 'electronic', name: 'Electronic', color: 'bg-[#7B2CBF]' },
  { id: 'classical', name: 'Classical', color: 'bg-[#7B2CBF]' },
];

// Fallback image to use when thumbnails fail to load
const FALLBACK_IMAGE = "https://via.placeholder.com/300/0f0f0f/d93250?text=No+Image";

// List of verified/popular artists for special badges
const verifiedArtists = [
  'Drake', 'Taylor Swift', 'The Weeknd', 'Beyoncé', 'Kendrick Lamar', 'Eminem', 'Rihanna', 'Ariana Grande',
  'Justin Bieber', 'Ed Sheeran', 'Bruno Mars', 'Post Malone', 'Travis Scott', 'Billie Eilish', 'Bad Bunny',
  'Lady Gaga', 'Dua Lipa', 'Kanye West', 'Jay-Z', 'Nicki Minaj', 'BTS', 'Cardi B', 'Megan Thee Stallion',
  'Lil Wayne', 'Coldplay', 'Adele', 'SZA', 'J. Cole', 'Imagine Dragons', 'Calvin Harris', 'Doja Cat'
];

// Helper function to check if an artist is verified
const isVerifiedArtist = (artist: string): boolean => {
  if (!artist) return false;
  const artistLower = artist.toLowerCase();
  return verifiedArtists.some(vArtist => 
    artistLower.includes(vArtist.toLowerCase()) || 
    vArtist.toLowerCase().includes(artistLower)
  );
};

// Add utility functions for formatting data
const cleanTitle = (title: string): string => {
  // Remove common phrases like "Official Video", "Lyrics", etc.
  return title
    .replace(/\(Official Video\)|\(Official Music Video\)|\(Official Audio\)|\(Lyrics\)|\[Lyrics\]|\(Visualizer\)/gi, '')
    .trim();
};

const formatViewCount = (viewCount: string | number | undefined): string => {
  if (!viewCount) return '0 views';
  
  const count = typeof viewCount === 'string' ? parseInt(viewCount) : viewCount;
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  } else {
    return `${count} views`;
  }
};

const formatPublishedDate = (date: string | undefined): string => {
  if (!date) return '';
  
  const published = new Date(date);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 1) {
    return 'Today';
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// TrackCard component for consistent rendering of tracks
const TrackCard = ({ track, onClick }: { track: YouTubeVideo; onClick: () => void }) => {
  const isVerified = isVerifiedArtist(track.artist);
  const viewCount = parseInt(track.viewCount?.replace(/[KMB]/g, '') || '0') || 0;
  const isTrending = viewCount >= 1000000;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group bg-[#181818] rounded-lg overflow-hidden transition-all duration-300 hover:bg-[#282828] hover:transform hover:translate-y-[-4px] cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-square">
        <img 
          src={track.thumbnailUrl} 
          alt={track.title} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = FALLBACK_IMAGE;
          }}
        />
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
          {track.duration}
        </div>

        {/* Play Button Overlay */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button className="bg-[#1ed760] text-black p-3 rounded-full transform hover:scale-110 transition-all hover:bg-[#1fdf64] active:scale-95">
            <Play className="w-6 h-6" fill="black" />
          </button>
        </div>
      </div>

      {/* Track Info */}
      <div className="p-4">
        <h3 className="text-white font-medium text-sm mb-1 line-clamp-2 group-hover:text-[#1ed760]">
          {cleanTitle(track.title)}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[#b3b3b3] text-sm line-clamp-1 group-hover:text-white transition-colors">
            {track.artist}
          </p>
          {isVerified && (
            <span className="bg-[#1ed760] rounded-full p-1 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-black" />
            </span>
          )}
        </div>

        {/* Track Stats */}
        <div className="flex items-center justify-between text-xs text-[#b3b3b3]">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatViewCount(track.viewCount)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>{formatPublishedDate(track.publishedAt)}</span>
            {isTrending && (
              <div className="flex items-center gap-1 text-[#1ed760]">
                <Flame className="w-3.5 h-3.5" />
                <span>Trending</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add loading skeleton component
const TrackCardSkeleton = () => (
  <div className="bg-[#181818] rounded-lg overflow-hidden animate-pulse">
    <div className="aspect-square bg-[#282828]" />
    <div className="p-4">
      <div className="h-4 bg-[#282828] rounded w-3/4 mb-2" />
      <div className="h-4 bg-[#282828] rounded w-1/2 mb-4" />
      <div className="flex justify-between">
        <div className="h-3 bg-[#282828] rounded w-1/4" />
        <div className="h-3 bg-[#282828] rounded w-1/4" />
      </div>
    </div>
  </div>
);

export const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [recentTracks, setRecentTracks] = useState<YouTubeVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [genreMusic, setGenreMusic] = useState<Record<string, YouTubeVideo[]>>({});
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { setCurrentTrack, setIsPlaying, setPlaybackMode } = usePlayerStore();

  // Add search query state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch popular music on load
  useEffect(() => {
    const fetchPopularMusic = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching popular music for home page");
        const videos = await getPopularMusic();
        
        if (!videos || videos.length === 0) {
          console.error("No popular music available");
          setError('No music available right now. Please try again later.');
          setRecentTracks([]);
        } else {
          console.log(`Received ${videos.length} popular tracks:`, videos);
          setRecentTracks(videos);
        setError(null);
        }
      } catch (err) {
        console.error('Error fetching popular music:', err);
        setError('Failed to load music. Please check your API configuration.');
        setRecentTracks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularMusic();
  }, []);

  // Fetch music for a genre when selected
  useEffect(() => {
    const fetchGenreMusic = async (genreId: string) => {
      try {
        // If we already have music for this genre, don't fetch again
        if (genreMusic[genreId] && genreMusic[genreId].length > 0) {
          console.log(`Using cached music for genre: ${genreId}`);
          return;
        }

        setIsLoading(true);
        console.log(`Fetching music for genre: ${genreId}`);
        const genreName = genres.find(g => g.id === genreId)?.name || genreId;
        const videos = await getGenreMusic(genreName);
        
        if (!videos || videos.length === 0) {
          console.log(`No music found for genre: ${genreId}`);
        } else {
          console.log(`Received ${videos.length} tracks for genre: ${genreId}`, videos);
          setGenreMusic(prev => ({
            ...prev,
            [genreId]: videos
          }));
        }
      } catch (err) {
        console.error(`Error fetching ${genreId} music:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedGenre) {
      fetchGenreMusic(selectedGenre);
    }
  }, [selectedGenre, genreMusic]);

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Searching for:", query);
      const results = await searchMusic(query);
      
      if (!results || results.length === 0) {
        console.log(`No results found for query: "${query}"`);
        setError(`No results found for "${query}". Try a different search.`);
        setSearchResults([]);
      } else {
        console.log(`Received ${results.length} search results for query: "${query}"`, results);
    setSearchResults(results);
    setError(null);
      }
    } catch (err) {
      console.error('Error searching music:', err);
      setError('Search failed. Please check your API configuration.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Play a track
  const playTrack = (track: YouTubeVideo, mode: 'audio' | 'video' = 'audio') => {
    console.log(`Playing track: ${track.id} - ${track.title} in ${mode} mode`);
    setCurrentTrack(track);
    setPlaybackMode(mode);
    setIsPlaying(true);
  };

  // Handle genre selection
  const handleGenreClick = (genreId: string) => {
    console.log(`Selected genre: ${genreId}`);
    setSelectedGenre(genreId);
  };

  // Loading state with skeletons
  if (isLoading && !recentTracks.length && !Object.keys(genreMusic).length) {
    return (
      <div className="flex flex-col gap-8 py-4 px-4">
        {/* Search Bar Skeleton */}
        <div className="relative max-w-3xl mx-auto w-full">
          <div className="w-full h-12 rounded-full bg-[#282828] animate-pulse" />
        </div>

        {/* Discover Section Skeleton */}
        <div className="relative overflow-hidden rounded-xl bg-[#2B1964] animate-pulse">
          <div className="p-8">
            <div className="h-10 bg-[#3B2474] rounded w-1/2 mb-4" />
            <div className="h-6 bg-[#3B2474] rounded w-3/4 mb-4" />
            <div className="h-10 bg-[#3B2474] rounded w-32" />
          </div>
        </div>

        {/* Genre Grid Skeleton */}
        <div>
          <div className="h-8 bg-[#282828] rounded w-48 mb-4 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-[#282828] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Track Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <TrackCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !searchResults.length && !recentTracks.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-white text-center">{error}</h2>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#1ed760] text-black px-6 py-2 rounded-full font-medium hover:bg-[#1fdf64] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4 px-4">
      {/* Search Bar */}
      <div className="relative max-w-3xl mx-auto w-full">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full h-12 pl-12 pr-4 rounded-full bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF] hover:bg-[#2a2a2a] transition-colors"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#7B2CBF]"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Search Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {searchResults.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onClick={() => playTrack(track)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Show error if search fails */}
      {error && (
        <div className="w-full max-w-3xl mx-auto bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Only show discover section and genres if not searching */}
      {!searchResults.length && (
        <>
          {/* Discover Section */}
          <div className="relative overflow-hidden rounded-xl bg-[#2B1964] text-white">
            <div className="p-8 relative z-10">
              <h1 className="text-4xl font-bold mb-2">Discover New Music</h1>
              <p className="text-lg text-gray-300 mb-4">Listen to the latest tracks from your favorite artists.</p>
              <button 
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform active:scale-95"
                onClick={() => {
                  if (recentTracks.length > 0) {
                    playTrack(recentTracks[0]);
                  }
                }}
              >
                Play Now
              </button>
            </div>
            <div className="absolute -right-10 top-1/2 transform -translate-y-1/2 rotate-12 flex gap-4">
              {recentTracks.slice(0, 4).map((track, index) => (
                <div
                  key={track.id}
                  className="w-32 h-32 bg-[#3B2474] rounded-lg shadow-lg transform rotate-12 overflow-hidden"
                >
                  <img 
                    src={track.thumbnailUrl} 
                    alt={track.title}
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Browse Genres */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Browse Genres</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreClick(genre.id)}
                  className={`${genre.color} aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-all active:scale-95 ${selectedGenre === genre.id ? 'ring-4 ring-white/50' : ''}`}
                >
                  <span className="text-white font-medium">{genre.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Genre Tracks */}
          {selectedGenre && genreMusic[selectedGenre] && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Top {genres.find(g => g.id === selectedGenre)?.name} Tracks</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {genreMusic[selectedGenre].map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onClick={() => playTrack(track)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};