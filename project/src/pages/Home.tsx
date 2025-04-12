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
    <div className="flex flex-col gap-8 py-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          className="w-full h-12 pl-12 pr-4 rounded-full bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]"
        />
      </div>

      {/* Discover Section */}
      <div className="relative overflow-hidden rounded-xl bg-[#2B1964] text-white">
        <div className="p-8">
          <h1 className="text-4xl font-bold mb-2">Discover New Music</h1>
          <p className="text-lg text-gray-300 mb-4">Listen to the latest tracks from your favorite artists.</p>
          <button 
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform"
            onClick={() => {
              // Handle play now action
            }}
          >
            Play Now
          </button>
        </div>
        <div className="absolute -right-10 top-1/2 transform -translate-y-1/2 rotate-12 flex gap-4">
          {[1, 2, 3, 4].map((_, index) => (
            <div
              key={index}
              className="w-32 h-32 bg-[#3B2474] rounded-lg shadow-lg transform rotate-12"
            />
          ))}
        </div>
      </div>

      {/* Browse Genres */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Browse Genres</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {genres.map((genre) => (
            <div
              key={genre.id}
              className={`${genre.color} aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform`}
            >
              <span className="text-white font-medium">{genre.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};