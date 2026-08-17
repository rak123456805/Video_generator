import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Download, Share2, Clock, Calendar, X, Eye, MoreHorizontal, Sparkles } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';

interface RecentVideosProps {
  showAll?: boolean;
}

export function RecentVideos({ showAll = false }: RecentVideosProps) {
  const { recentVideos } = useVideo();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  const generatedVideos = recentVideos.map((video, index) => ({
    id: `generated-${index}`,
    title: video.topic || 'Untitled Video',
    duration: video.isFullCourse ? `Part ${video.currentPart}` : '15 min',
    date: new Date(video.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    thumbnail: video.videoUrl || '',
    views: 'New',
    videoUrl: video.videoUrl,
    isGenerated: true,
    category: 'AI Generated',
  }));

  const mockVideos = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      duration: '30 min',
      date: 'Aug 15, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop&q=85',
      views: '1.2k',
      isGenerated: false,
      videoUrl: undefined,
      category: 'Technology',
    },
    {
      id: 2,
      title: 'Advanced Python Programming',
      duration: '60 min',
      date: 'Aug 12, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=340&fit=crop&q=85',
      views: '856',
      isGenerated: false,
      videoUrl: undefined,
      category: 'Programming',
    },
    {
      id: 3,
      title: 'Web Development Fundamentals',
      duration: '15 min',
      date: 'Aug 10, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=340&fit=crop&q=85',
      views: '2.3k',
      isGenerated: false,
      videoUrl: undefined,
      category: 'Development',
    },
    {
      id: 4,
      title: 'Data Science with Pandas',
      duration: '45 min',
      date: 'Aug 8, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop&q=85',
      views: '3.1k',
      isGenerated: false,
      videoUrl: undefined,
      category: 'Data Science',
    },
    {
      id: 5,
      title: 'Neural Networks Deep Dive',
      duration: '60 min',
      date: 'Aug 5, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=340&fit=crop&q=85',
      views: '4.7k',
      isGenerated: false,
      videoUrl: undefined,
      category: 'AI & ML',
    },
    {
      id: 6,
      title: 'React & TypeScript Masterclass',
      duration: '30 min',
      date: 'Aug 2, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=340&fit=crop&q=85',
      views: '5.2k',
      isGenerated: false,
      videoUrl: undefined,
      category: 'Frontend',
    },
  ];

  const allVideos = [...generatedVideos, ...mockVideos];
  const displayedVideos = showAll ? allVideos : allVideos.slice(0, 3);

  const categoryColors: Record<string, string> = {
    'AI Generated': '#7C3AED',
    'Technology': '#6D28D9',
    'Programming': '#5B21B6',
    'Development': '#4C1D95',
    'Data Science': '#7C3AED',
    'AI & ML': '#6D28D9',
    'Frontend': '#5B21B6',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          {showAll ? 'All Videos' : 'Recent Videos'}
        </h3>
        {!showAll && (
          <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
            View All <span className="text-xs">→</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className={`grid gap-5 ${showAll ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
        {displayedVideos.map((video, idx) => {
          const catColor = categoryColors[video.category] || '#7C3AED';
          return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              onMouseEnter={() => setHoveredId(video.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="rounded-2xl overflow-hidden group relative"
              style={{
                background: 'rgba(6,0,16,0.8)',
                border: `1px solid ${hoveredId === video.id ? catColor + '55' : 'rgba(139,92,246,0.15)'}`,
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                boxShadow: hoveredId === video.id ? `0 0 30px ${catColor}25` : 'none',
              }}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                {video.isGenerated && video.videoUrl ? (
                  <video src={video.videoUrl} className="w-full h-full object-cover" preload="metadata" />
                ) : (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}

                {/* Overlay on hover */}
                <AnimatePresence>
                  {hoveredId === video.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(2px)' }}
                    >
                      <motion.button
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        onClick={() => video.videoUrl && setSelectedVideo(video.videoUrl)}
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(109,40,217,0.9)', boxShadow: '0 0 30px rgba(109,40,217,0.6)' }}
                      >
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {video.isGenerated && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: 'rgba(109,40,217,0.9)' }}>
                      <Sparkles className="w-3 h-3" /> AI
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: `${catColor}cc` }}>
                    {video.category}
                  </span>
                </div>

                {/* Duration badge */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                  <Clock className="w-3 h-3" /> {video.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h4 className="font-semibold text-white mb-2 line-clamp-2 leading-snug">{video.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {video.date}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views} views</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => video.videoUrl && setSelectedVideo(video.videoUrl)}
                    className="flex-1 py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 12px rgba(109,40,217,0.3)' }}
                  >
                    <Play className="w-3.5 h-3.5" /> Watch
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl text-slate-500 hover:text-purple-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl text-slate-500 hover:text-purple-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={handleCloseVideo}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-5xl rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 0 80px rgba(109,40,217,0.4)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseVideo}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <X className="w-5 h-5" />
              </button>
              <video src={selectedVideo} controls autoPlay className="w-full h-auto max-h-[80vh]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function handleCloseVideo() { setSelectedVideo(null); }
}