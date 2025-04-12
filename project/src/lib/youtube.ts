export interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  duration: string;
  url: string;
  albumArt: string;
  viewCount?: string;
  publishedAt?: string;
}

// List of popular/mainstream music artists to prioritize
const popularArtists = [
  'Drake', 'Taylor Swift', 'The Weeknd', 'Beyoncé', 'Kendrick Lamar', 'Eminem', 'Rihanna', 'Ariana Grande',
  'Justin Bieber', 'Ed Sheeran', 'Bruno Mars', 'Post Malone', 'Travis Scott', 'Billie Eilish', 'Bad Bunny',
  'Lady Gaga', 'Dua Lipa', 'Kanye West', 'Jay-Z', 'Nicki Minaj', 'BTS', 'Cardi B', 'Megan Thee Stallion',
  'Lil Wayne', 'Coldplay', 'Adele', 'SZA', 'J. Cole', 'Imagine Dragons', 'Calvin Harris', 'Doja Cat',
  'The Beatles', 'Michael Jackson', 'Elton John', 'Queen', 'Madonna', 'Mariah Carey', 'Whitney Houston',
  'Frank Ocean', 'Tyler, The Creator', 'Olivia Rodrigo', 'Lil Nas X', 'Harry Styles', 'The Rolling Stones',
  'Metallica', 'Nirvana', 'Led Zeppelin', 'Pink Floyd', 'U2', 'ABBA', 'AC/DC', 'Johnny Cash', 'Bob Dylan',
  'David Bowie', 'Prince', 'Stevie Wonder', 'Alicia Keys', 'Usher', 'John Legend', 'Maroon 5', 'Katy Perry',
  'Snoop Dogg', 'Dr. Dre', 'Tupac Shakur', 'The Notorious B.I.G.', 'Ice Cube', 'Red Hot Chili Peppers',
  'Foo Fighters', 'Green Day', 'Linkin Park', 'Twenty One Pilots', 'Panic! At The Disco', 'Fall Out Boy'
];

// Function to check if an artist is popular or mainstream
const isPopularArtist = (artist: string): boolean => {
  if (!artist) return false;
  
  // Convert to lowercase for case-insensitive matching
  const artistLower = artist.toLowerCase();
  
  // Check if the artist name is in our list of popular artists (case insensitive)
  return popularArtists.some(popularArtist => 
    artistLower.includes(popularArtist.toLowerCase()) || 
    popularArtist.toLowerCase().includes(artistLower)
  );
};

// Format duration from ISO 8601 format (PT1H2M3S) to human-readable (1:02:03)
const formatDuration = (isoDuration: string): string => {
  if (!isoDuration) return "0:00";
  
  // Remove PT prefix
  const duration = isoDuration.replace('PT', '');
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  // Extract hours, minutes, seconds
  if (duration.includes('H')) {
    const hoursPart = duration.split('H')[0];
    hours = parseInt(hoursPart, 10);
  }
  
  if (duration.includes('M')) {
    const minutesPart = duration.includes('H') 
      ? duration.split('H')[1].split('M')[0] 
      : duration.split('M')[0];
    minutes = parseInt(minutesPart, 10);
  }
  
  if (duration.includes('S')) {
    const secondsPart = duration.includes('M') 
      ? duration.split('M')[1].split('S')[0] 
      : duration.includes('H') 
        ? duration.split('H')[1].split('S')[0] 
        : duration.split('S')[0];
    seconds = parseInt(secondsPart, 10);
  }
  
  // Format output
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

// Function to clean YouTube titles
const cleanTitle = (title: string): { title: string; artist: string } => {
  // Remove common text like "Official Video", "Official Music Video", etc.
  let cleanedTitle = title
    .replace(/\(Official Video\)/gi, '')
    .replace(/\(Official Music Video\)/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\(Lyric Video\)/gi, '')
    .replace(/\[Official Video\]/gi, '')
    .replace(/\[Official Music Video\]/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .replace(/\[Lyric Video\]/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[Audio\]/gi, '')
    .replace(/\(Video\)/gi, '')
    .replace(/\[Video\]/gi, '')
    .replace(/\(OFFICIAL\)/gi, '')
    .replace(/\[OFFICIAL\]/gi, '')
    .replace(/\(HQ\)/gi, '')
    .replace(/\[HQ\]/gi, '')
    .trim();
  
  // Split artist and title if they follow the "Artist - Title" format
  const parts = cleanedTitle.split(' - ');
  if (parts.length > 1) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }
  
  // Otherwise, return the video uploader as artist and the full title
  return {
    artist: '',  // We'll use the channel title from YouTube as fallback
    title: cleanedTitle
  };
};

// Get the best available thumbnail from a YouTube snippet
const getBestThumbnail = (thumbnails: any): string => {
  if (!thumbnails) return '';
  
  // Try to get thumbnails in descending order of quality
  return thumbnails.maxres?.url || 
         thumbnails.standard?.url || 
         thumbnails.high?.url || 
         thumbnails.medium?.url || 
         thumbnails.default?.url || 
         '';
};

// Format view count to be more readable
const formatViewCount = (count: string): string => {
  if (!count) return '0';
  
  const num = parseInt(count);
  if (isNaN(num)) return '0';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
};

// Filter videos to keep only those from popular artists or with high view counts
const filterToPopularVideos = (videos: YouTubeVideo[]): YouTubeVideo[] => {
  // First, sort by view count (highest first)
  const sortedVideos = [...videos].sort((a, b) => {
    const viewCountA = parseInt(a.viewCount?.replace(/[KMB]/g, '') || '0') || 0;
    const viewCountB = parseInt(b.viewCount?.replace(/[KMB]/g, '') || '0') || 0;
    return viewCountB - viewCountA;
  });
  
  // Then filter out non-popular content
  return sortedVideos.filter(video => {
    // Keep videos from popular artists
    if (isPopularArtist(video.artist)) {
      return true;
    }
    
    // Keep videos with high view counts (likely popular content)
    const viewCount = parseInt(video.viewCount?.replace(/[KMB]/g, '') || '0') || 0;
    if (viewCount >= 1000000) { // 1M+ views
      return true;
    }
    
    // Filter out obvious non-music content
    const lowerTitle = video.title.toLowerCase();
    const lowerArtist = video.artist.toLowerCase();
    
    // Filter out gameplay, vlogs, tutorials, etc.
    if (
      lowerTitle.includes('minecraft') || 
      lowerTitle.includes('gameplay') || 
      lowerTitle.includes('tutorial') || 
      lowerTitle.includes('walkthrough') ||
      lowerTitle.includes('how to') ||
      lowerTitle.includes('reaction') ||
      lowerArtist.includes('tutorial') ||
      lowerArtist.includes('gaming')
    ) {
      return false;
    }
    
    // Default to include
    return true;
  });
};

// Direct YouTube API Implementation (no Supabase Edge Function required)
export const searchMusic = async (query: string): Promise<YouTubeVideo[]> => {
  try {
    console.log("Searching music with query:", query);
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    if (!apiKey) {
      throw new Error("YouTube API key is not configured");
    }
    
    // Add "official music" to search query to prioritize official content
    const enhancedQuery = `${query} official music`;
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&q=${encodeURIComponent(enhancedQuery)}&type=video&videoCategoryId=10&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("YouTube API search error response:", error);
      throw new Error(error.error?.message || 'Failed to search music');
    }

    const data = await response.json();
    console.log("YouTube API search response:", data);
    
    // Get video IDs to fetch durations in a single request
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    
    // Fetch video details to get duration
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`
    );
    
    if (!detailsResponse.ok) {
      console.error("Failed to fetch video details");
    }
    
    const detailsData = await detailsResponse.json();
    const detailsMap = new Map();
    
    if (detailsData.items) {
      detailsData.items.forEach((item: any) => {
        detailsMap.set(item.id, {
          duration: item.contentDetails?.duration || '',
          viewCount: item.statistics?.viewCount || '0'
        });
      });
    }
    
    // Transform data to match our interface
    const videos = data.items.map((item: any) => {
      const videoId = item.id.videoId;
      const snippet = item.snippet;
      const details = detailsMap.get(videoId) || {};
      
      // Get the highest quality thumbnail available
      const thumbnailUrl = getBestThumbnail(snippet.thumbnails);
      const albumArt = thumbnailUrl;
      
      // Clean up title and extract artist if possible
      const { title, artist } = cleanTitle(snippet.title);
      
      return {
        id: videoId,
        title: title,
        artist: artist || snippet.channelTitle,
        thumbnailUrl,
        albumArt,
        duration: formatDuration(details.duration || ''),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        viewCount: formatViewCount(details.viewCount || '0'),
        publishedAt: new Date(snippet.publishedAt).toLocaleDateString()
      };
    });
    
    // Filter to only popular content
    const filteredVideos = filterToPopularVideos(videos);
    
    // Return only up to 20 filtered videos
    return filteredVideos.slice(0, 20);
  } catch (error) {
    console.error('Search music error:', error);
    throw error;
  }
};

export const getPopularMusic = async (): Promise<YouTubeVideo[]> => {
  try {
    console.log("Fetching popular music");
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    if (!apiKey) {
      throw new Error("YouTube API key is not configured");
    }
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&maxResults=30&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("YouTube API popular music error response:", error);
      throw new Error(error.error?.message || 'Failed to fetch popular music');
    }

    const data = await response.json();
    console.log("YouTube API popular music response:", data);
    
    // Transform data to match our interface
    const videos = data.items.map((item: any) => {
      const videoId = item.id;
      const snippet = item.snippet;
      
      // Get the highest quality thumbnail available
      const thumbnailUrl = getBestThumbnail(snippet.thumbnails);
      const albumArt = thumbnailUrl;
      
      // Clean up title and extract artist if possible
      const { title, artist } = cleanTitle(snippet.title);
      
      return {
        id: videoId,
        title: title,
        artist: artist || snippet.channelTitle,
        thumbnailUrl,
        albumArt,
        duration: formatDuration(item.contentDetails?.duration || ''),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        viewCount: formatViewCount(item.statistics?.viewCount || '0'),
        publishedAt: new Date(snippet.publishedAt).toLocaleDateString()
      };
    });
    
    // Filter to only popular artists and high-view content
    const filteredVideos = filterToPopularVideos(videos);
    
    // Return filtered videos
    return filteredVideos;
  } catch (error) {
    console.error('Get popular music error:', error);
    throw error;
  }
};

// Get music by genre
export const getGenreMusic = async (genre: string, maxResults: number = 8): Promise<YouTubeVideo[]> => {
  try {
    console.log(`Fetching ${genre} music`);
    // Use the searchMusic function with genre-specific query
    // Add "official music" to prioritize real music content
    return await searchMusic(`${genre} music official popular`);
  } catch (error) {
    console.error(`Get ${genre} music error:`, error);
    throw error;
  }
};