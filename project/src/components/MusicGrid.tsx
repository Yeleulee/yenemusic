import React from 'react';
import { Play } from 'lucide-react';
import { YouTubeVideo } from '../lib/youtube';
import { usePlayerStore } from '../store/playerStore';

interface MusicGridProps {
  videos: YouTubeVideo[];
  title: string;
}

export const MusicGrid: React.FC<MusicGridProps> = ({ videos, title }) => {
  const { setCurrentTrack, setIsPlaying } = usePlayerStore();

  const handlePlay = (video: YouTubeVideo) => {
    setCurrentTrack(video);
    setIsPlaying(true);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {videos.length === 0 ? (
        <p className="text-gray-400">No results found</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-[#212121] rounded-lg p-4 hover:bg-[#282828] transition-colors group cursor-pointer"
              onClick={() => handlePlay(video)}
            >
              <div className="relative mb-4">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(video);
                  }}
                  className="absolute bottom-2 right-2 bg-primary p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-6 h-6 text-white" />
                </button>
              </div>
              <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{video.artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};