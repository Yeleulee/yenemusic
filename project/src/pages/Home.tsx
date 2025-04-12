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

// Update the genres with more visual information
const genres = [
  { 
    id: 'pop', 
    name: 'Pop', 
    color: 'from-pink-500 to-purple-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f00000002ca5a7517156021292e5663a6',
    artists: ['Taylor Swift', 'Ed Sheeran', 'Ariana Grande']
  },
  { 
    id: 'hiphop', 
    name: 'Hip Hop', 
    color: 'from-blue-500 to-indigo-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f000000025f0ff9251e3cfe641160dc31',
    artists: ['Drake', 'Kendrick Lamar', 'Travis Scott']
  },
  { 
    id: 'rnb', 
    name: 'R&B', 
    color: 'from-purple-500 to-pink-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f00000002c9f71c6658d096e5172046f2',
    artists: ['The Weeknd', 'SZA', 'Beyoncé']
  },
  { 
    id: 'rock', 
    name: 'Rock', 
    color: 'from-red-500 to-orange-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f00000002fe6d8d1019d5b302213e3730',
    artists: ['Imagine Dragons', 'Coldplay', 'Arctic Monkeys']
  },
  { 
    id: 'electronic', 
    name: 'Electronic', 
    color: 'from-cyan-500 to-blue-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f000000026d1564c1309ea1187c3d0767',
    artists: ['Calvin Harris', 'Daft Punk', 'Avicii']
  },
  { 
    id: 'classical', 
    name: 'Classical', 
    color: 'from-amber-500 to-yellow-600',
    coverUrl: 'https://i.scdn.co/image/ab67706f00000002d72ef75e14ca6f60ea2364c2',
    artists: ['Mozart', 'Beethoven', 'Bach']
  }
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
    <div className="flex flex-col gap-12 py-6 px-6">
      {/* Hero Section */}
      <div className="relative h-[400px] rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B1964] to-[#7B2CBF] opacity-90" />
        <div className="absolute inset-0 bg-[url('https://i.scdn.co/image/ab67706f00000002ca5a7517156021292e5663a6')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex flex-col justify-center px-8 sm:px-12 max-w-4xl">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight">
            Discover Your Next <br />Favorite Track
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl">
            Explore millions of tracks across all genres. Stream high-quality music and create your perfect playlist.
          </p>
          <div className="flex gap-4">
            <button 
              className="bg-[#1ed760] text-black px-8 py-3 rounded-full font-semibold hover:scale-105 transition-all hover:bg-[#1fdf64] active:scale-95"
              onClick={() => recentTracks.length > 0 && playTrack(recentTracks[0])}
            >
              Play Now
            </button>
            <button className="bg-white/10 backdrop-blur text-white px-8 py-3 rounded-full font-semibold hover:bg-white/20 transition-all">
              Browse All
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-3xl mx-auto w-full">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full h-14 pl-12 pr-4 rounded-full bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1ed760] hover:bg-[#2a2a2a] transition-colors text-lg"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1ed760] border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white mb-6">Search Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {searchResults.map((track) => (
              <TrackCard key={track.id} track={track} onClick={() => playTrack(track)} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Genre Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {genres.map((genre) => (
              <div
                key={genre.id}
                className="relative h-[280px] rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => handleGenreClick(genre.id)}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img 
                    src={genre.coverUrl} 
                    alt={genre.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-80 group-hover:opacity-90 transition-opacity`} />
                </div>

                {/* Content */}
                <div className="relative h-full p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">{genre.name}</h3>
                    <p className="text-white/80">Top Artists:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {genre.artists.map((artist) => (
                        <span key={artist} className="bg-black/30 text-white px-3 py-1 rounded-full text-sm">
                          {artist}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button className="bg-white/10 backdrop-blur w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-[#1ed760] transition-colors">
                    <Play className="w-6 h-6 text-white group-hover:text-black" fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Genre Tracks */}
          {selectedGenre && genreMusic[selectedGenre] && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Top {genres.find(g => g.id === selectedGenre)?.name} Tracks
                </h2>
                <button 
                  onClick={() => setSelectedGenre(null)}
                  className="text-[#1ed760] hover:text-white transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {genreMusic[selectedGenre].map((track) => (
                  <TrackCard key={track.id} track={track} onClick={() => playTrack(track)} />
                ))}
              </div>
            </div>
          )}

          {/* Featured Artists */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Featured Artists</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
              {verifiedArtists.slice(0, 8).map((artist, index) => (
                <div
                  key={artist}
                  className="group cursor-pointer"
                  onClick={() => setSearchQuery(artist)}
                >
                  <div className="relative aspect-square rounded-full overflow-hidden mb-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 opacity-80 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-8 h-8 text-white" fill="currentColor" />
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium text-center truncate group-hover:text-[#1ed760] transition-colors">
                    {artist}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-3xl mx-auto bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};