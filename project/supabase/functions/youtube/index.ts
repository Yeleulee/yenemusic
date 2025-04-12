import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'trending';
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    console.log(`YouTube API request: action=${action}, query=${query}, limit=${limit}`);

    let youtubeUrl = '';
    if (action === 'search' && query) {
      youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${limit}&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
    } else {
      youtubeUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=${limit}&key=${YOUTUBE_API_KEY}`;
    }

    const response = await fetch(youtubeUrl);
    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API error:', error);
      return new Response(
        JSON.stringify({ error: 'YouTube API error', details: error }),
        { status: response.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform data to match our interface
    const videos = (action === 'search' ? data.items : data.items).map((item: any) => {
      const videoId = action === 'search' ? item.id.videoId : item.id;
      const snippet = item.snippet;
      
      return {
        id: videoId,
        title: snippet.title,
        artist: snippet.channelTitle,
        thumbnailUrl: snippet.thumbnails.medium.url,
        albumArt: snippet.thumbnails.high.url,
        duration: item.contentDetails?.duration || '00:00',
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });

    return new Response(
      JSON.stringify(videos),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});