import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchMusic, getPopularMusic, YouTubeVideo } from '../lib/youtube';
import { usePlayerStore } from '../store/playerStore';

// Mock data for the playlist
const playlistData = {
  title: "High Distortion",
  trackCount: 45,
  duration: "55 mins",
  songs: [
    { id: "1", title: "Black Amplifier", artist: "The Sigit", duration: "02:37" },
    { id: "2", title: "Let the Right One In", artist: "The Sigit", duration: "02:21" },
    { id: "3", title: "Dilarang Di Bandung", artist: "Seringai", duration: "02:56" },
    { id: "4", title: "New Generation", artist: "The Sigit", duration: "02:37" },
    { id: "5", title: "Tragedi", artist: "Seringai", duration: "02:56" },
  ],
  featuredAlbums: [
    { id: "1", title: "The Emptiness Machine", artist: "Linkin Park", year: "2024", image: "https://via.placeholder.com/180/0f0f0f/d93250" },
    { id: "2", title: "Tragedi", artist: "Seringai", year: "2012", image: "https://via.placeholder.com/180/0f0f0f/efefef" },
    { id: "3", title: "Another Day", artist: "The Sigit", year: "2020", image: "https://via.placeholder.com/180/0f0f0f/fb5a73" },
    { id: "4", title: "Detourn", artist: "The Sigit", year: "2013", image: "https://via.placeholder.com/180/0f0f0f/ead39a" },
    { id: "5", title: "Adrenaline Merusuh", artist: "Seringai", year: "2018", image: "https://via.placeholder.com/180/0f0f0f/f5423c" },
  ]
};

export const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentTrack: setPlayerTrack, setIsPlaying } = usePlayerStore();
  
  // Fetch suggestions on load
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const videos = await getPopularMusic();
        setSuggestions(videos.slice(0, 5));
        setError(null);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Failed to load suggestions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSuggestions();
  }, []);
  
  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchMusic(searchQuery);
      setSearchResults(results);
      setError(null);
    } catch (err) {
      console.error('Error searching music:', err);
      setError('Failed to search music. Please try again later.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Play a song from the playlist
  const playPlaylistSong = (songId: string) => {
    setCurrentTrack(songId);
    
    // Find the playlist song
    const song = playlistData.songs.find(s => s.id === songId);
    if (song) {
      // Search for the actual song details
      searchMusic(`${song.title} ${song.artist}`)
        .then(results => {
          if (results && results.length > 0) {
            // Use the first result (most relevant)
            setPlayerTrack(results[0]);
            setIsPlaying(true);
          } else {
            setError("Couldn't find playable version of this track");
          }
        })
        .catch(err => {
          console.error("Error loading song:", err);
          setError("Failed to load song from YouTube API");
        });
    }
  };
  
  // Play a song from search results or suggestions
  const playTrack = (track: YouTubeVideo) => {
    setPlayerTrack(track);
    setIsPlaying(true);
  };
  
  // Play all songs
  const playAllSongs = () => {
    if (playlistData.songs.length > 0) {
      playPlaylistSong(playlistData.songs[0].id);
    }
  };
  
  return (
    <div className="pb-24">
      {/* Search Bar at top */}
      <div className="flex justify-between items-center mb-8">
        <form onSubmit={handleSearch} className="relative w-[500px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search song, artists, albums or podcast"
            className="w-full bg-[#212121] text-white px-4 py-2 pl-10 rounded-full focus:outline-none text-sm"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-red-500 rounded-full"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
        </form>
        
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#a0a0a0] flex items-center justify-center text-white">
            <span className="text-sm">U</span>
          </div>
        </div>
      </div>
      
      {/* Show search results if any */}
      {searchResults.length > 0 ? (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Search Results</h2>
          <div className="space-y-2">
            {searchResults.map(track => (
              <div 
                key={track.id} 
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-[#212121] cursor-pointer group"
                onClick={() => playTrack(track)}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={track.albumArt || track.thumbnailUrl} 
                    alt={track.title} 
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <h3 className="text-white font-medium text-sm">{track.title}</h3>
                    <p className="text-gray-400 text-xs">{track.artist}</p>
                  </div>
                </div>
                <div className="text-gray-400 text-sm">{track.duration}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* Playlist Header */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-white mb-2">{playlistData.title}</h1>
            <div className="text-gray-400 text-sm flex items-center">
              <span>{playlistData.trackCount} songs</span>
              <span className="mx-2">•</span>
              <span>{playlistData.duration}</span>
            </div>
          </div>
          
          {/* Featured Albums */}
          <div className="mb-12">
            <div className="grid grid-cols-6 gap-4">
              {playlistData.featuredAlbums.map((album, index) => (
                <div key={album.id} className={index === 5 ? "relative group cursor-pointer" : "relative cursor-pointer"}>
                  <img 
                    src={album.image} 
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                  {index === 5 && (
                    <div className="absolute inset-0 bg-[#121212]/80 rounded-md flex items-center justify-center">
                      <div className="bg-red-500 rounded-full w-12 h-12 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    </div>
                  )}
                  <div className="mt-2">
                    <h3 className="text-white font-medium text-sm">{album.title}</h3>
                    <p className="text-gray-400 text-xs">{album.artist}</p>
                    <p className="text-gray-500 text-xs">{album.year}</p>
                  </div>
                </div>
              ))}
              <div className="relative cursor-pointer" onClick={playAllSongs}>
                <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[#3a1c3b] to-[#191919] flex items-center justify-center">
                  <div className="bg-red-500 rounded-full w-12 h-12 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-medium text-sm">Play All Music</h3>
                </div>
              </div>
            </div>
          </div>
          
          {/* All Songs Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">All Songs</h2>
              <button className="bg-[#212121] text-white text-sm px-4 py-1 rounded-full">Show All</button>
            </div>
            
            <div className="space-y-2">
              {playlistData.songs.map((song) => (
                <div 
                  key={song.id} 
                  className={`flex items-center justify-between py-2 px-3 rounded-md hover:bg-[#212121] cursor-pointer group ${currentTrack === song.id ? 'bg-[#212121]' : ''}`}
                  onClick={() => playPlaylistSong(song.id)}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://via.placeholder.com/40/181818/${song.artist === 'Seringai' ? 'f5423c' : '9d9d9d'}`} 
                      alt={song.title} 
                      className="w-10 h-10 rounded"
                    />
                    <div>
                      <h3 className={`font-medium text-sm ${currentTrack === song.id ? 'text-red-500' : 'text-white'}`}>{song.title}</h3>
                      <p className="text-gray-400 text-xs">{song.artist}</p>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">{song.duration}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Suggestions Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Suggestions</h2>
            
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((song) => (
                  <div 
                    key={song.id} 
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-[#212121] cursor-pointer"
                    onClick={() => playTrack(song)}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={song.albumArt || song.thumbnailUrl} 
                        alt={song.title} 
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div>
                        <h3 className="text-white font-medium text-sm">{song.title}</h3>
                        <p className="text-gray-400 text-xs">{song.artist}</p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">{song.duration}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {error && (
        <div className="bg-red-900/20 text-red-500 py-2 px-4 rounded-md mt-4">
          {error}
        </div>
      )}
    </div>
  );
}; 