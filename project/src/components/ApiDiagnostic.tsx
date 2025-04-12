import React, { useState, useEffect } from 'react';
import { checkYouTubeApiConnection } from '../lib/apiCheck';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';

export const ApiDiagnostic = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const checkResult = await checkYouTubeApiConnection();
      setResult(checkResult);
    } catch (error) {
      setResult({
        success: false,
        message: 'Error running diagnostics',
        details: error
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="bg-[#121212] rounded-lg p-6 shadow-lg max-w-md mx-auto">
      <h2 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
        YouTube API Diagnostic
        <button 
          onClick={runCheck}
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-700 text-white p-1 rounded-full"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </h2>
      
      {loading ? (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : result ? (
        <div>
          <div className={`p-4 rounded-md mb-4 ${result.success ? 'bg-green-800/30' : 'bg-red-800/30'}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <Check size={20} className="text-green-400" />
              ) : (
                <AlertTriangle size={20} className="text-red-400" />
              )}
              <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            </div>
          </div>
          
          {!result.success && (
            <div className="mt-4">
              <h3 className="text-white text-lg mb-2">Troubleshooting Steps:</h3>
              <ul className="text-gray-300 text-sm list-disc pl-5 space-y-2">
                <li>Check that your <code className="bg-gray-800 px-1 rounded">.env</code> file has the correct YouTube API key</li>
                <li>Verify your YouTube API key is valid and has not expired</li>
                <li>Check if your YouTube API key has quota available</li>
                <li>Make sure your API key has access to the YouTube Data API v3</li>
                <li>Ensure your YouTube API key has proper application restrictions (if any)</li>
              </ul>
            </div>
          )}

          {result.success && (
            <div className="mt-4">
              <h3 className="text-white text-lg mb-2">Connection Details:</h3>
              <div className="text-gray-300 text-sm">
                <p>Received {result.details?.tracksReceived} tracks from the API</p>
                {result.details?.firstTrack && (
                  <div className="mt-2 border border-gray-700 p-2 rounded">
                    <p><strong>Sample Track:</strong> {result.details.firstTrack.title}</p>
                    <p><strong>Artist:</strong> {result.details.firstTrack.artist}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}; 