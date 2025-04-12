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
  { id: 'pop', name: 'Pop', color: 'from-pink-500 to-purple-500', icon: '🎵' },
  { id: 'rock', name: 'Rock', color: 'from-red-500 to-orange-500', icon: '🎸' },
  { id: 'hiphop', name: 'Hip Hop', color: 'from-blue-500 to-indigo-500', icon: '🎧' },
  { id: 'rnb', name: 'R&B', color: 'from-purple-500 to-indigo-500', icon: '🎤' },
  { id: 'electronic', name: 'Electronic', color: 'from-cyan-500 to-blue-500', icon: '🎛️' },
  { id: 'classical', name: 'Classical', color: 'from-amber-500 to-yellow-500', icon: '🎻' },
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
  // Check if this artist is verified
  const isVerified = isVerifiedArtist(track.artist);
  
  // Check if this is a trending track (1M+ views)
  const viewCount = parseInt(track.viewCount?.replace(/[KMB]/g, '') || '0') || 0;
  const isTrending = viewCount >= 1000000;

  return (
    <div 
      className="bg-[#181818] rounded-md overflow-hidden transition-all duration-300 hover:bg-[#282828] cursor-pointer p-2 sm:p-3 md:p-4 h-full flex flex-col"
      onClick={onClick}
    >
      <div className="relative w-full pb-[100%] mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-md">
        <img 
          src={track.thumbnailUrl} 
          alt={track.title} 
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://via.placeholder.com/300x300/121212/FFFFFF?text=No+Image';
          }}
        />
        <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
          {track.duration}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
          <button className="p-2 sm:p-3 bg-white text-black rounded-full transform hover:scale-110 transition-transform">
            <Play className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
      <h3 className="text-white font-medium text-xs sm:text-sm md:text-base mb-1 line-clamp-2">{cleanTitle(track.title)}</h3>
      <div className="flex items-center mb-1">
        <p className="text-gray-400 text-xs sm:text-sm line-clamp-1 mr-1">{track.artist}</p>
        {isVerified && (
          <span className="bg-blue-500 rounded-full p-0.5 flex items-center justify-center">
            <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
          </span>
        )}
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 mt-auto">
        <div className="flex items-center text-gray-400 text-xs">
          <Eye className="w-3 h-3 mr-1" />
          <span className="text-[10px] sm:text-xs">{formatViewCount(track.viewCount)}</span>
        </div>
        <div className="text-gray-400 text-[10px] sm:text-xs">
          {formatPublishedDate(track.publishedAt)}
        </div>
        {isTrending && (
          <div className="flex items-center text-red-500 text-[10px] sm:text-xs ml-auto">
            <Flame className="w-3 h-3 mr-0.5" />
            <span>Trending</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [recentTracks, setRecentTracks] = useState<YouTubeVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [genreMusic, setGenreMusic] = useState<Record<string, YouTubeVideo[]>>({});
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { setCurrentTrack, setIsPlaying, setPlaybackMode } = usePlayerStore();

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

  if (isLoading && !recentTracks.length && !Object.keys(genreMusic).length) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 pb-24">
      {/* Search Bar - adjusted for mobile */}
      <div className="mb-4 sm:mb-6 md:mb-10 w-full max-w-[600px] px-1">
        <SearchBar onSearch={handleSearch} placeholder="Search songs, artists, albums..." />
        
        {error && (
          <div className="mt-3 p-2 sm:p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-xs sm:text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search Results - improved grid for mobile */}
      {searchResults.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1">Search Results</h2>
          <div className="max-h-[800px] overflow-y-auto pr-1 sm:pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {searchResults.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onClick={() => playTrack(track)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Default Home Content */}
      {searchResults.length === 0 && (
        <>
          {/* Featured Content - improved for mobile */}
          <section className="mb-6 sm:mb-8 md:mb-12">
            <div className="relative bg-gradient-to-br from-blue-900 to-indigo-900 h-[140px] sm:h-[180px] md:h-[240px] rounded-xl p-3 sm:p-4 md:p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full">
                <div className="absolute transform rotate-[-20deg] -right-10 -top-20">
                  <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4">
                    {recentTracks.slice(0, 6).map((track, idx) => (
                      <img 
                        key={idx} 
                        src={track.albumArt || track.thumbnailUrl} 
                        className="w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 rounded-md shadow-md transform hover:scale-105 transition-transform" 
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = FALLBACK_IMAGE;
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 max-w-md mt-4 sm:mt-6 md:mt-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 md:mb-4">
                  Popular Artists & Hits
                </h2>
                <p className="text-blue-100 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base">
                  Listen to the latest tracks from top artists and trending music.
                </p>
                <button 
                  className="bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-100 font-medium py-1 sm:py-1.5 md:py-2 px-3 sm:px-4 md:px-6 rounded-full transition-colors text-xs sm:text-sm md:text-base touch-manipulation"
                  onClick={() => recentTracks.length > 0 && playTrack(recentTracks[0])}
                >
                  Play Now
                </button>
              </div>
            </div>
          </section>

          {/* Browse Genres - improved grid layout */}
          <section className="mb-6 sm:mb-8">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1 flex items-center">
              <Disc className="w-5 h-5 mr-2 text-blue-500" />
              Popular Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {genres.map((genre) => (
                <div 
                  key={genre.id}
                  className={`
                    bg-gradient-to-br relative group overflow-hidden
                    ${genre.id === 'pop' ? 'from-pink-600 to-pink-800' : 
                      genre.id === 'rock' ? 'from-red-600 to-red-800' : 
                      genre.id === 'hiphop' ? 'from-blue-600 to-blue-800' : 
                      genre.id === 'rnb' ? 'from-purple-600 to-purple-800' : 
                      genre.id === 'electronic' ? 'from-cyan-600 to-cyan-800' : 
                      'from-amber-600 to-amber-800'}
                    rounded-md p-2 sm:p-3 md:p-4 aspect-square cursor-pointer transition-transform hover:scale-105
                  `}
                  onClick={() => handleGenreClick(genre.name)}
                >
                  <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity"></div>
                  <div className="text-3xl sm:text-4xl mb-2">{genre.icon}</div>
                  <span className="text-white font-bold text-xs sm:text-sm md:text-base text-center relative z-10">
                    {genre.name}
                  </span>
                  <div className="absolute bottom-2 right-2 text-white text-xs opacity-70">
                    {genre.id === 'pop' || genre.id === 'hiphop' ? 
                      <Flame className="w-3 h-3 text-white" /> : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Selected Genre Music */}
          {selectedGenre && genreMusic[selectedGenre] && genreMusic[selectedGenre].length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">
                  Top {genres.find(g => g.id === selectedGenre)?.name} Tracks
                </h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {genreMusic[selectedGenre].slice(0, 8).map(track => (
                  <TrackCard 
                    key={track.id} 
                    track={track} 
                    onClick={() => playTrack(track)} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Artists Section */}
          <section className="mb-8">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1 flex items-center">
              <Music className="w-5 h-5 mr-2 text-green-500" />
              Featured Artists
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {verifiedArtists.slice(0, 12).map((artist, index) => (
                <div 
                  key={index} 
                  onClick={() => handleSearch(artist)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="w-full aspect-square relative mb-2 overflow-hidden rounded-full bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <span className="text-white text-xs sm:text-sm text-center font-medium">
                    {artist}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Your Playlists Section */}
          <section className="mb-6 sm:mb-8">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1">Your Playlists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id}
                  className="bg-[#181818] rounded-md overflow-hidden transition-all duration-300 hover:bg-[#282828] cursor-pointer p-2 sm:p-3 md:p-4 flex items-center"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gray-800 rounded-md flex items-center justify-center mr-2 sm:mr-3 md:mr-4 flex-shrink-0">
                    <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-xs sm:text-sm md:text-base mb-1">{playlist.name}</h3>
                    <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm">{playlist.trackCount} songs</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Recently Played Section */}
          {recentTracks.length > 0 && (
            <section className="mb-8">
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1 flex items-center">
                <Flame className="w-5 h-5 mr-2 text-red-500" /> 
                Trending Hits
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {recentTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onClick={() => playTrack(track)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};