import { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardSidebar } from './DashboardSidebar';
import { GenerateVideoSection } from './GenerateVideoSection';
import { RecentVideos } from './RecentVideos';
import { AnalyticsSection } from './AnalyticsSection';
import { QuizSection } from './QuizSection';
import { GoogleDriveSettings } from './GoogleDriveSettings';
import {
  Video, TrendingUp, Clock, Calendar,
  Sparkles, ArrowUpRight, Zap, Users,
  Plus, Eye, BarChart2, CheckCircle2, Shield,
  Brain, Star
} from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../../api/client';
import { getQuizStats, QuizStats } from '../../api/quizApi';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

/* ── Animated stat card ── */
function StatCard({ icon: Icon, label, value, change, positive, delay = 0, accent = '#8B5CF6' }: {
  icon: any; label: string; value: string; change: string; positive: boolean; delay?: number; accent?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative rounded-2xl p-6 overflow-hidden group cursor-default bg-[#0d041c]/90 border border-purple-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all duration-300"
    >
      {/* Corner glow on hover */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30">
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${positive ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-red-400 bg-red-400/10'}`}>
            <ArrowUpRight className="w-3 h-3" />{change}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </motion.div>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { videoData, recentVideos } = useVideo();
  const { user, session } = useAuth();
  const currentUserId = user?.id || null;
  const token = session?.access_token || '';

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

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const page = params.get('page');

    if (page === 'dashboard' && tab) {
      const validTabs = ['dashboard', 'generate', 'videos', 'analytics', 'quiz', 'settings'];
      if (validTabs.includes(tab)) {
        return tab;
      }
    }
    if ((params.has('drive_connected') || params.has('drive_error')) && page === 'dashboard') {
      return 'settings';
    }
    return 'dashboard';
  });

  const [backendVideos, setBackendVideos] = useState<any[]>([]);

  // Fetch completed backend videos
  useEffect(() => {
    apiClient.get('/video/list')
      .then((res) => {
        if (res.data?.videos) setBackendVideos(res.data.videos);
      })
      .catch(() => {});
  }, []);

  // Synchronize activeTab with URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'dashboard');
    params.set('tab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [activeTab]);

  // Handle tab param changes from URL (e.g. after OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const page = params.get('page');
    if (page === 'dashboard' && tab) {
      const validTabs = ['dashboard', 'generate', 'videos', 'analytics', 'quiz', 'settings'];
      if (validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    } else if ((params.has('drive_connected') || params.has('drive_error')) && page === 'dashboard') {
      setActiveTab('settings');
    }
  }, []);

  // Construct combined generatedVideos array (identical logic to RecentVideos.tsx)
  const backendMapped = backendVideos.map((v, index) => {
    const hasLocalCopy = v.finalVideo && v.finalVideo.startsWith('/generated');
    const isDriveVideo = v.driveUploaded && v.driveFileId;
    
    const finalVideoPath = hasLocalCopy
      ? v.finalVideo
      : isDriveVideo
        ? `/api/google-drive/stream/${v.driveFileId}?token=${token}`
        : v.finalVideo;

    return {
      id: `backend-${v.jobId || index}`,
      title: v.topic || 'Untitled Video',
      duration: v.isFullCourse ? `Part ${v.part}` : '15 min',
      date: new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      views: 'New',
      videoUrl: ensureAbsoluteUrl(finalVideoPath),
      driveFileUrl: v.driveFileUrl || null,
      driveUploaded: v.driveUploaded || false,
      topic: v.topic || 'Untitled Video',
      jobId: v.jobId,
      createdAt: v.createdAt,
      mode: v.mode,
      isFullCourse: v.isFullCourse,
      part: v.part,
    };
  });

  const backendJobIds = new Set(backendVideos.map((v) => v.jobId));
  const localOnlyMapped = recentVideos
    .filter((v) => !!v.videoUrl && !backendJobIds.has(v.jobId as string) && (v.userId === currentUserId || (!v.userId && !currentUserId)))
    .map((v, index) => {
      const hasLocalCopy = v.videoUrl && v.videoUrl.includes('/generated');
      const isDriveVideo = v.driveUploaded && v.driveFileId;
      
      const finalUrl = hasLocalCopy
        ? v.videoUrl
        : isDriveVideo
          ? `/api/google-drive/stream/${v.driveFileId}?token=${token}`
          : v.videoUrl;

      return {
        id: `local-${index}`,
        title: v.topic || 'Untitled Video',
        duration: v.isFullCourse ? `Part ${v.currentPart}` : '15 min',
        date: new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        views: 'New',
        videoUrl: ensureAbsoluteUrl(finalUrl),
        driveFileUrl: v.driveFileUrl || null,
        driveUploaded: v.driveUploaded || false,
        topic: v.topic || 'Untitled Video',
        jobId: v.jobId,
        createdAt: v.timestamp,
        mode: v.isFullCourse ? 'FULL' : 'CRASH',
        isFullCourse: v.isFullCourse,
        part: v.currentPart,
        scriptSlides: v.scriptSlides,
      };
    });

  const generatedVideos = [...backendMapped, ...localOnlyMapped];

  // Calculations for real data metrics
  const totalMinutes = generatedVideos.reduce((acc, v) => {
    if (v.scriptSlides && v.scriptSlides.length > 0) {
      return acc + (v.scriptSlides.length * 18) / 60;
    }
    return acc + (v.isFullCourse ? 8 : 3);
  }, 0);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const videosThisWeek = generatedVideos.filter(v => new Date(v.createdAt).getTime() >= oneWeekAgo).length;

  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const videosThisMonth = generatedVideos.filter(v => new Date(v.createdAt).getTime() >= oneMonthAgo).length;

  const getWeeklyData = () => {
    const data = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now.setDate(now.getDate() + distanceToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    generatedVideos.forEach((v) => {
      const date = new Date(v.createdAt);
      if (date >= startOfWeek) {
        const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const index = day === 0 ? 6 : day - 1; // map Mon->0, Tue->1, ..., Sun->6
        data[index]++;
      }
    });
    return data;
  };

  const weeklyData = getWeeklyData();

  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);

  // Fetch quiz statistics
  useEffect(() => {
    getQuizStats()
      .then((data) => setQuizStats(data))
      .catch(() => {});
  }, [activeTab]);

  const stats = [
    { icon: Video, label: 'Videos Generated', value: String(generatedVideos.length), change: `+${videosThisWeek}`, positive: true, accent: '#8B5CF6' },
    { icon: Clock, label: 'Minutes Created', value: String(Math.round(totalMinutes)), change: 'Live', positive: true, accent: '#A855F7' },
    { icon: Brain, label: 'Quizzes Taken', value: quizStats ? String(quizStats.totalTaken) : '0', change: 'Supabase', positive: true, accent: '#D946EF' },
    { icon: Star, label: 'Average Grade', value: quizStats ? quizStats.avgGrade : 'N/A', change: `${quizStats ? quizStats.avgPercentage : 0}%`, positive: true, accent: '#6366F1' },
  ];

  const quickActions = [
    { icon: Sparkles, label: 'Generate Video', sub: 'Create new AI course', action: () => setActiveTab('generate'), from: '#301979', to: '#6331E8' },
    { icon: BarChart2, label: 'Analytics', sub: 'View performance', action: () => setActiveTab('analytics'), from: '#1e1b4b', to: '#4338ca' },
    { icon: Users, label: 'Quiz Mode', sub: 'Test comprehension', action: () => setActiveTab('quiz'), from: '#4c1d95', to: '#7e22ce' },
    { icon: Zap, label: 'My Videos', sub: 'Browse library', action: () => setActiveTab('videos'), from: '#581c87', to: '#9333ea' },
  ];



  const tabVariants = {
    hidden: { opacity: 0, x: 15 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -15 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-white selection:bg-purple-500 selection:text-white">
      <DashboardNavbar onNavigate={onNavigate} />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate} />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
          <div className="p-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">

              {/* ── DASHBOARD TAB ── */}
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* VocalLabs Hero Banner inside Dashboard */}
                  <div className="rounded-3xl p-8 bg-gradient-to-r from-[#12072b] via-[#1a083b] to-[#0d0321] border border-purple-500/30 shadow-[0_0_40px_rgba(124,58,237,0.2)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/40 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        AI Video Dashboard Engine
                      </div>
                      <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Welcome back 👋</h1>
                      <p className="text-slate-300 text-sm max-w-xl">
                        Create, manage, and analyze your AI video courses under your brand with 99.9% uptime.
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('generate')}
                      className="relative z-10 flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] border border-purple-400/50 shadow-[0_0_25px_rgba(144,106,243,0.5)] hover:shadow-[0_0_40px_rgba(144,106,243,0.8)] transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Create New Course
                    </motion.button>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {stats.map((s, i) => <StatCard key={i} {...s} delay={i * 0.08} />)}
                  </div>

                  {/* Activity + Chart row */}
                  <div className="grid lg:grid-cols-3 gap-5">
                    {/* Weekly Chart */}
                    <div className="lg:col-span-2 rounded-3xl p-6 bg-[#0d041c]/90 border border-purple-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-white font-bold text-lg">Course Generation Traffic</h3>
                          <p className="text-slate-400 text-xs mt-0.5">Videos generated this week</p>
                        </div>
                        <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 border border-emerald-500/20 px-3 py-1 rounded-full">+24% vs last week</span>
                      </div>

                      {/* Bar Chart */}
                      <div className="flex items-end gap-2.5 h-28 mb-3 pt-4">
                        {weeklyData.map((v, i) => {
                          const max = Math.max(...weeklyData);
                          const pct = (v / max) * 100;
                          return (
                            <motion.div
                              key={i}
                              className="flex-1 rounded-xl relative group cursor-default overflow-hidden"
                              initial={{ height: 0 }}
                              animate={{ height: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.2 + i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                              style={{ minHeight: 6, background: 'linear-gradient(to top, #301979, #906AF3)' }}
                            >
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded text-[10px] text-white font-bold whitespace-nowrap bg-purple-900 border border-purple-500/40 z-20">
                                {v} videos
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-semibold pt-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
                      </div>
                    </div>

                    {/* Quick Activity Stats Panel */}
                    <div className="rounded-3xl p-6 bg-[#0d041c]/90 border border-purple-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                      <h3 className="text-white font-bold text-lg mb-4">Platform Health</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Avg. watch time', value: '24 min', icon: Eye, change: '+5%' },
                          { label: 'Completion rate', value: '94.8%', icon: TrendingUp, change: '+2.1%' },
                          { label: 'Total learners', value: '1,284', icon: Users, change: '+18%' },
                          { label: 'System Uptime', value: '99.9%', icon: Shield, change: 'Optimal' },
                        ].map((item, i) => {
                          const Icon = item.icon;
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-purple-500/10 last:border-0">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20">
                                  <Icon className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="text-slate-300 text-xs font-semibold">{item.label}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-bold text-sm">{item.value}</div>
                                <div className="text-emerald-400 text-[10px] font-bold">{item.change}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Navigation</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {quickActions.map((a, i) => {
                        const Icon = a.icon;
                        return (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.07 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={a.action}
                            className="p-5 rounded-2xl text-left group relative overflow-hidden border border-purple-500/30 shadow-[0_8px_25px_rgba(0,0,0,0.5)]"
                            style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                          >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
                            <Icon className="w-6 h-6 text-white mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-white font-bold text-sm leading-tight">{a.label}</p>
                            <p className="text-white/70 text-xs mt-1">{a.sub}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Videos section */}
                  <div className="rounded-3xl overflow-hidden border border-purple-500/25 bg-[#0d041c]/90 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
                    <div className="px-6 pt-6 pb-2 border-b border-purple-500/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg">Recent Videos</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Your latest generated video courses</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('videos')}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="p-6">
                      <RecentVideos />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── GENERATE TAB ── */}
              {activeTab === 'generate' && (
                <motion.div key="generate" variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-1">Generate Video Course</h1>
                    <p className="text-slate-400 text-sm">Create a new AI-powered educational video course</p>
                  </div>
                  <div className="rounded-3xl overflow-hidden">
                    <GenerateVideoSection />
                  </div>
                </motion.div>
              )}

              {/* ── VIDEOS TAB ── */}
              {activeTab === 'videos' && (
                <motion.div key="videos" variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-black text-white mb-1">My Videos Library</h1>
                      <p className="text-slate-400 text-sm">Browse and manage your generated video courses</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveTab('generate')}
                      className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] shadow-[0_0_20px_rgba(144,106,243,0.5)]"
                    >
                      <Plus className="w-4 h-4" /> New Video
                    </motion.button>
                  </div>
                  <RecentVideos showAll />
                </motion.div>
              )}

              {/* ── ANALYTICS TAB ── */}
              {activeTab === 'analytics' && (
                <motion.div key="analytics" variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-1">Course Analytics</h1>
                    <p className="text-slate-400 text-sm">Track your video creation, views, and student engagement</p>
                  </div>
                  <div className="rounded-3xl overflow-hidden bg-[#0d041c]/90 border border-purple-500/25 p-6 shadow-xl">
                    <AnalyticsSection videos={generatedVideos} />
                  </div>
                </motion.div>
              )}

              {/* ── QUIZ TAB ── */}
              {activeTab === 'quiz' && (
                <motion.div key="quiz" variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-1">Quiz Mode</h1>
                    <p className="text-slate-400 text-sm">Test your knowledge with AI-generated course quizzes</p>
                  </div>
                  <div className="rounded-3xl overflow-hidden bg-[#0d041c]/90 border border-purple-500/25 p-6 shadow-xl">
                    <QuizSection topic={videoData.topic} scriptSlides={videoData.scriptSlides} language={videoData.language} />
                  </div>
                </motion.div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === 'settings' && (
                <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-1">Settings</h1>
                    <p className="text-slate-400 text-sm">Manage your storage, preferences, and integrations</p>
                  </div>

                  {/* Storage section */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Storage</h2>
                    <GoogleDriveSettings />
                  </div>

                  {/* Branding section (existing placeholder) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Branding</h2>
                    <div className="rounded-2xl p-8 text-center bg-[#0d041c]/90 border border-purple-500/25 shadow-xl">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-purple-500/10 border border-purple-500/30">
                        <Sparkles className="w-7 h-7 text-purple-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">White-Label Branding</h3>
                      <p className="text-slate-400 text-sm max-w-md mx-auto">
                        Custom domain setup, brand logo upload, and custom color themes are available for enterprise partners.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
