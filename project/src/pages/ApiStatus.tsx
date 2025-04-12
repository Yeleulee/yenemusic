import React from 'react';
import { ApiDiagnostic } from '../components/ApiDiagnostic';

export const ApiStatus = () => {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-2xl font-bold mb-8">YouTube API Status</h1>
        
        <div className="space-y-6">
          <ApiDiagnostic />
          
          <div className="bg-[#121212] rounded-lg p-6 shadow-lg">
            <h2 className="text-white text-xl font-semibold mb-4">API Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-300 text-md font-medium">Environment Variables</h3>
                <div className="mt-2 bg-[#1d1d1d] p-3 rounded text-sm font-mono overflow-x-auto">
                  <p className="text-green-400">VITE_YOUTUBE_API_KEY: {import.meta.env.VITE_YOUTUBE_API_KEY ? '✓ Set' : '✗ Not Set'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-gray-300 text-md font-medium">Configuration Steps</h3>
                <ol className="mt-2 text-gray-300 text-sm list-decimal pl-5 space-y-2">
                  <li>Create a <code className="bg-gray-800 px-1 rounded">.env</code> file in the project root if it doesn't exist</li>
                  <li>Add the YouTube API key: <code className="bg-gray-800 px-1 rounded">VITE_YOUTUBE_API_KEY=your_api_key</code></li>
                  <li>Restart the development server</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-gray-300 text-md font-medium">YouTube API Resources</h3>
                <ul className="mt-2 text-gray-300 text-sm list-disc pl-5 space-y-2">
                  <li><a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a> - Manage your API keys</li>
                  <li><a href="https://developers.google.com/youtube/v3/getting-started" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">YouTube API Documentation</a> - Official docs</li>
                  <li><a href="https://developers.google.com/youtube/v3/determine_quota_cost" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Quota Calculator</a> - Check API usage limits</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 