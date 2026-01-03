import { Play, Download, Share2, EllipsisVertical, Clock, Calendar } from 'lucide-react';

interface RecentVideosProps {
  showAll?: boolean;
}

export function RecentVideos({ showAll = false }: RecentVideosProps) {
  const videos = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      duration: '30 min',
      date: 'Dec 20, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
      views: '1.2k',
    },
    {
      id: 2,
      title: 'Advanced Python Programming',
      duration: '1 hour',
      date: 'Dec 18, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop',
      views: '856',
    },
    {
      id: 3,
      title: 'Web Development Fundamentals',
      duration: '15 min',
      date: 'Dec 15, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop',
      views: '2.3k',
    },
    {
      id: 4,
      title: 'Data Science with R',
      duration: '30 min',
      date: 'Dec 12, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop',
      views: '654',
    },
    {
      id: 5,
      title: 'React Best Practices',
      duration: '1 hour',
      date: 'Dec 10, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop',
      views: '1.8k',
    },
    {
      id: 6,
      title: 'Cloud Computing Basics',
      duration: '30 min',
      date: 'Dec 8, 2024',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop',
      views: '945',
    },
  ];

  const displayedVideos = showAll ? videos : videos.slice(0, 3);

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
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
                  <Play className="w-5 h-5 text-gray-900 ml-0.5" />
                </button>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {video.duration}
              </div>
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
                <button className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm">
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
    </div>
  );
}