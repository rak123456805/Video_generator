import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Download, Share2, Clock, Calendar, X, Eye, MoreHorizontal, Sparkles, HardDrive, Video, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import apiClient from '../../api/client';
import { useAuth } from '../contexts/AuthContext';

interface RecentVideosProps {
  showAll?: boolean;
}

export function RecentVideos({ showAll = false }: RecentVideosProps) {
  const { recentVideos } = useVideo();
  const { user, session } = useAuth();
  const currentUserId = user?.id || null;
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; driveFileUrl?: string | null } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [backendVideos, setBackendVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoErrors, setVideoErrors] = useState<Set<string>>(new Set());

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    let cleanUrl = url;
    if (cleanUrl.startsWith('http://localhost:5173')) {
      cleanUrl = cleanUrl.replace('http://localhost:5173', '');
    }
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    return `${base}${cleanPath}`;
  };

  // Fetch all completed videos from backend on mount
  useEffect(() => {
    apiClient.get('/video/list')
      .then((res) => {
        if (res.data?.videos) setBackendVideos(res.data.videos);
      })
      .catch(() => { /* silently fall back to localStorage only */ })
      .finally(() => setLoading(false));
  }, []);

  // Download helper — fetches as blob for a real file download
  async function handleDownload(video: { id: string; videoUrl: string | undefined; topic: string }) {
    if (!video.videoUrl) return;
    setDownloadingId(video.id);
    try {
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = (video.topic || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeName}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: force-download via anchor with download attr
      const link = document.createElement('a');
      link.href = video.videoUrl!;
      const safeName = (video.topic || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeName}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  }

  const token = session?.access_token || '';
  const isLocalDev = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
  const backendBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

  // Build an absolute stream URL for Google Drive proxy
  const buildStreamUrl = (driveFileId: string) =>
    `${backendBase}/api/google-drive/stream/${driveFileId}?token=${encodeURIComponent(token)}`;

  // Build video list from backend (source of truth) + localStorage (supplement)
  const backendMapped = backendVideos.map((v, index) => {
    const hasLocalCopy = v.finalVideo && v.finalVideo.startsWith('/generated');
    const isDriveVideo = v.driveUploaded && v.driveFileId;

    let finalVideoPath: string;
    if (isLocalDev && hasLocalCopy) {
      finalVideoPath = ensureAbsoluteUrl(v.finalVideo);
    } else if (isDriveVideo) {
      finalVideoPath = buildStreamUrl(v.driveFileId);
    } else {
      finalVideoPath = ensureAbsoluteUrl(v.finalVideo || '');
    }

    return {
      id: `backend-${v.jobId || index}`,
      title: v.topic || 'Untitled Video',
      duration: v.isFullCourse ? `Part ${v.part}` : '15 min',
      date: new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      views: 'New',
      videoUrl: finalVideoPath,
      driveFileUrl: v.driveFileUrl || null,
      driveUploaded: v.driveUploaded || false,
      topic: v.topic || 'Untitled Video',
      jobId: v.jobId,
    };
  });

  // Add any localStorage videos not already covered by backend (by jobId or videoUrl) and belonging to this user
  const backendJobIds = new Set(backendVideos.map((v) => v.jobId));
  const localOnlyMapped = recentVideos
    .filter((v) => !!v.videoUrl && !backendJobIds.has(v.jobId as string) && (v.userId === currentUserId || (!v.userId && !currentUserId)))
    .map((v, index) => {
      const hasLocalCopy = v.videoUrl && v.videoUrl.includes('/generated');
      const isDriveVideo = v.driveUploaded && v.driveFileId;

      let finalUrl: string;
      if (isLocalDev && hasLocalCopy) {
        finalUrl = ensureAbsoluteUrl(v.videoUrl);
      } else if (isDriveVideo) {
        finalUrl = buildStreamUrl(v.driveFileId);
      } else {
        finalUrl = ensureAbsoluteUrl(v.videoUrl || '');
      }

      return {
        id: `local-${index}`,
        title: v.topic || 'Untitled Video',
        duration: v.isFullCourse ? `Part ${v.currentPart}` : '15 min',
        date: new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        views: 'New',
        videoUrl: finalUrl,
        driveFileUrl: v.driveFileUrl || null,
        driveUploaded: v.driveUploaded || false,
        topic: v.topic || 'Untitled Video',
        jobId: v.jobId,
      };
    });

  const generatedVideos = [...backendMapped, ...localOnlyMapped];
  const displayedVideos = showAll ? generatedVideos : generatedVideos.slice(0, 3);

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{showAll ? 'All Videos' : 'Recent Videos'}</h3>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="ml-3 text-slate-400 text-sm">Loading your videos...</span>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────
  if (generatedVideos.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {showAll ? 'All Videos' : 'Recent Videos'}
          </h3>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
          style={{ border: '1px dashed rgba(139,92,246,0.3)', background: 'rgba(6,0,16,0.5)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Video className="w-7 h-7 text-purple-400" />
          </div>
          <h4 className="text-white font-bold text-lg mb-2">No videos yet</h4>
          <p className="text-slate-500 text-sm max-w-xs">
            Videos you generate will appear here. Head over to "Generate Video" to create your first AI course!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          {showAll ? `All Videos (${generatedVideos.length})` : 'Recent Videos'}
        </h3>
      </div>

      {/* Grid */}
      <div className={`grid gap-5 ${showAll ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
        {displayedVideos.map((video, idx) => {
          const catColor = '#7C3AED';
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
                {video.videoUrl && !videoErrors.has(video.id) ? (
                  <video
                    src={video.videoUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    crossOrigin="use-credentials"
                    onError={() => setVideoErrors(prev => new Set(prev).add(video.id))}
                  />
                ) : videoErrors.has(video.id) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-2 p-3">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <p className="text-xs text-slate-400 text-center">Preview unavailable</p>
                    {video.driveFileUrl && (
                      <a href={video.driveFileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-purple-400 underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Open in Drive
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Video className="w-10 h-10 text-slate-600" />
                  </div>
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
                        onClick={() => video.videoUrl && setSelectedVideo({ url: video.videoUrl, driveFileUrl: video.driveFileUrl })}
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(109,40,217,0.9)', boxShadow: '0 0 30px rgba(109,40,217,0.6)' }}
                      >
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Badge */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'rgba(109,40,217,0.9)' }}>
                    <Sparkles className="w-3 h-3" /> AI Generated
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
                  {/* Watch */}
                  <button
                    onClick={() => video.videoUrl && setSelectedVideo({ url: video.videoUrl, driveFileUrl: video.driveFileUrl })}
                    className="flex-1 py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 12px rgba(109,40,217,0.3)' }}
                  >
                    <Play className="w-3.5 h-3.5" /> Watch
                  </button>

                  {/* Download or Drive */}
                  {video.driveUploaded && video.driveFileUrl ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => window.open(video.driveFileUrl || '', '_blank')}
                      className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                      title="Open in Google Drive"
                    >
                      <HardDrive className="w-4 h-4" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDownload(video)}
                      disabled={downloadingId === video.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-purple-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      title="Download video"
                    >
                      {downloadingId === video.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"
                        />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </motion.button>
                  )}

                  {/* Share */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={async () => {
                      if (video.videoUrl && navigator.share) {
                        try { await navigator.share({ title: video.title, url: video.videoUrl }); } catch {}
                      } else if (video.videoUrl) {
                        await navigator.clipboard.writeText(video.videoUrl);
                        alert('Video URL copied to clipboard!');
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-purple-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>

                  {/* More */}
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
              <VideoPlayerWithFallback
                src={selectedVideo.url}
                driveFileUrl={selectedVideo.driveFileUrl}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function handleCloseVideo() { setSelectedVideo(null); }
}

// ── Inline player with error fallback ─────────────────────────────────────
function VideoPlayerWithFallback({ src, driveFileUrl }: { src: string; driveFileUrl?: string | null }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 gap-4"
        style={{ background: '#0a0a0a', minHeight: '280px' }}>
        <AlertCircle className="w-12 h-12 text-amber-400" />
        <p className="text-slate-300 font-semibold text-lg">Unable to play video</p>
        <p className="text-slate-500 text-sm text-center max-w-xs">
          The video stream is unavailable. This typically happens when the backend storage has been cleared.
        </p>
        {driveFileUrl && (
          <a
            href={driveFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
          >
            <ExternalLink className="w-4 h-4" />
            Watch on Google Drive
          </a>
        )}
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      autoPlay
      crossOrigin="use-credentials"
      className="w-full h-auto max-h-[80vh]"
      onError={() => setErrored(true)}
    />
  );
}