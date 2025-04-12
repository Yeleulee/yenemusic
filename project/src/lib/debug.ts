// Debug utility for API troubleshooting

export const debugAPI = {
  // Check if API keys are configured
  checkAPIConfig: () => {
    const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const youtubeKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    console.log('API Configuration Check:');
    console.log('- Supabase URL:', supabaseURL ? '✓ Configured' : '✗ Missing');
    console.log('- Supabase Key:', supabaseKey ? '✓ Configured' : '✗ Missing');
    console.log('- YouTube API Key:', youtubeKey ? '✓ Configured' : '✗ Missing');
    
    return {
      supabaseConfigured: !!supabaseURL && !!supabaseKey,
      youtubeConfigured: !!youtubeKey,
      allConfigured: !!supabaseURL && !!supabaseKey && !!youtubeKey
    };
  },
  
  // Test the API endpoints
  testEndpoints: async () => {
    console.log('Testing API endpoints:');
    
    try {
      // Test Supabase/YouTube endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      if (response.ok) {
        console.log('- YouTube API endpoint: ✓ Working');
        return { success: true, data: await response.json() };
      } else {
        console.error('- YouTube API endpoint: ✗ Error', response.status, response.statusText);
        return { success: false, error: `Status ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      console.error('- YouTube API endpoint: ✗ Error', error);
      return { success: false, error: error.message };
    }
  }
}; 