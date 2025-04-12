import { getPopularMusic } from './youtube';

export const checkYouTubeApiConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    // Check if environment variables are properly set
    const youtubeKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    // Log configuration status
    console.log('API Configuration:');
    console.log('- YouTube API Key:', youtubeKey ? '✓ Configured' : '✗ Missing');
    
    // Check for missing configurations
    if (!youtubeKey) {
      return {
        success: false,
        message: 'YouTube API Key is not configured',
        details: { youtubeKey: 'Missing' }
      };
    }
    
    // Make direct test request to YouTube API to verify the key works
    const testYoutubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${youtubeKey}`;
    console.log('Testing YouTube API key with direct request...');
    
    const directResponse = await fetch(testYoutubeApiUrl);
    
    if (!directResponse.ok) {
      const directData = await directResponse.json();
      console.error('✗ YouTube API key validation failed', directData);
      return {
        success: false,
        message: 'YouTube API key is invalid or has quota issues',
        details: directData.error
      };
    }
    
    console.log('✓ YouTube API key is valid');
    const directData = await directResponse.json();
    
    // Test getting popular music
    console.log('Testing getPopularMusic function...');
    const videos = await getPopularMusic();
    
    if (videos && videos.length > 0) {
      return {
        success: true,
        message: 'YouTube API is properly connected',
        details: { 
          tracksReceived: videos.length,
          firstTrack: videos[0]
        }
      };
    } else {
      return {
        success: false,
        message: 'YouTube API returned empty results',
        details: { videos }
      };
    }
  } catch (error) {
    console.error('API connection check failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to connect to YouTube API',
      details: error
    };
  }
}; 