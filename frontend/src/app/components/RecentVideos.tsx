import { useState } from 'react';
import { Play, Download, Share2, EllipsisVertical, Clock, Calendar, X } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';

interface RecentVideosProps {
  showAll?: boolean;
}

export function RecentVideos({ showAll = false }: RecentVideosProps) {
  const { recentVideos } = useVideo();

  // Convert recent videos from context to display format
  const generatedVideos = recentVideos.map((video, index) => ({
    id: `generated-${index}`,
    title: video.topic || 'Untitled Video',
    duration: video.isFullCourse ? `Part ${video.currentPart}` : '15-60 min',
    date: new Date(video.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    thumbnail: video.videoUrl || '',
    views: 'New',
    videoUrl: video.videoUrl,
    isGenerated: true,
  }));

  const mockVideos = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      duration: '30 min',
      date: 'Dec 20, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
      views: '1.2k',
      isGenerated: false,
      videoUrl: undefined,
    },
    {
      id: 2,
      title: 'Advanced Python Programming',
      duration: '1 hour',
      date: 'Dec 18, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop',
      views: '856',
      isGenerated: false,
      videoUrl: undefined,
    },
    {
      id: 3,
      title: 'Web Development Fundamentals',
      duration: '15 min',
      date: 'Dec 15, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop',
      views: '2.3k',
      isGenerated: false,
      videoUrl: undefined,
    },
  ];

  // Combine generated videos with mock videos, generated videos first
  const allVideos = [...generatedVideos, ...mockVideos];
  const displayedVideos = showAll ? allVideos : allVideos.slice(0, 3);


  /* ---------------- VIDEO PLAYBACK STATE ---------------- */
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const handlePlayVideo = (videoUrl: string) => {
    setSelectedVideo(videoUrl);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl text-gray-900 dark:text-white">
          {showAll ? 'All Videos' : 'Recent Videos'}
        </h3>
        {!showAll && (
          <button className="text-purple-600 dark:text-purple-400 hover:underline">
            View All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
              {video.isGenerated && video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => video.isGenerated && video.videoUrl && handlePlayVideo(video.videoUrl)}
                  className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Play className="w-5 h-5 text-gray-900 ml-0.5" />
                </button>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {video.duration}
              </div>
              {video.isGenerated && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 rounded text-xs text-white font-semibold">
                  Generated
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h4 className="mb-2 text-gray-900 dark:text-white line-clamp-2">
                {video.title}
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {video.date}
                </div>
                <span>•</span>
                <span>{video.views} views</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => video.isGenerated && video.videoUrl && handlePlayVideo(video.videoUrl)}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4" />
                  Watch
                </button>
                <button className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Share2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <EllipsisVertical className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={handleCloseVideo}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full h-auto max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}