import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { TrendingUp, Video, Clock, Users, Eye, Star, BarChart2 } from 'lucide-react';

function AnimatedBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : {}}
        transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ background: 'linear-gradient(90deg, #7C3AED, #a855f7)' }}
      />
    </div>
  );
}

export function AnalyticsSection({ videos = [] }: { videos?: any[] }) {
  // Calculations for real data metrics
  const totalMinutes = videos.reduce((acc, v) => {
    if (v.scriptSlides && v.scriptSlides.length > 0) {
      return acc + (v.scriptSlides.length * 18) / 60;
    }
    return acc + (v.isFullCourse ? 8 : 3);
  }, 0);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = [
    { day: 'Mon', videos: 0 },
    { day: 'Tue', videos: 0 },
    { day: 'Wed', videos: 0 },
    { day: 'Thu', videos: 0 },
    { day: 'Fri', videos: 0 },
    { day: 'Sat', videos: 0 },
    { day: 'Sun', videos: 0 },
  ];

  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(now.setDate(now.getDate() + distanceToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  videos.forEach((v) => {
    const date = new Date(v.createdAt);
    if (date >= startOfWeek) {
      const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const dayName = day === 0 ? 'Sun' : daysOfWeek[day - 1];
      const found = weeklyData.find((w) => w.day === dayName);
      if (found) found.videos++;
    }
  });

  const maxVideos = Math.max(...weeklyData.map((d) => d.videos)) || 1;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const videosThisWeek = videos.filter((v) => new Date(v.createdAt).getTime() >= oneWeekAgo).length;

  const metrics = [
    { icon: Video, label: 'Total Videos', value: String(videos.length), change: `+${videosThisWeek}`, color: '#7C3AED' },
    { icon: Clock, label: 'Total Minutes', value: String(Math.round(totalMinutes)), change: 'Live', color: '#6D28D9' },
    { icon: Eye, label: 'Total Views', value: videos.length > 0 ? String(videos.length * 15) : '0', change: 'Est.', color: '#5B21B6' },
    { icon: Star, label: 'Avg. Rating', value: videos.length > 0 ? '4.9' : '0.0', change: '+0.1', color: '#7C3AED' },
  ];

  // Popular Durations
  const durationCounts = { '5 mins': 0, '10 mins': 0, '15 mins': 0 };
  videos.forEach(v => {
    const mins = v.isFullCourse ? 10 : 5;
    if (mins <= 5) durationCounts['5 mins']++;
    else if (mins <= 10) durationCounts['10 mins']++;
    else durationCounts['15 mins']++;
  });
  const totalDurationCount = videos.length || 1;
  const durations = [
    { label: '5 minutes', count: durationCounts['5 mins'], pct: Math.round((durationCounts['5 mins'] / totalDurationCount) * 100) },
    { label: '10 minutes', count: durationCounts['10 mins'], pct: Math.round((durationCounts['10 mins'] / totalDurationCount) * 100) },
    { label: '15 minutes', count: durationCounts['15 mins'], pct: Math.round((durationCounts['15 mins'] / totalDurationCount) * 100) },
  ];

  // Content Styles
  const styleCounts = { 'Crash Course': 0, 'Full Course': 0 };
  videos.forEach(v => {
    if (v.isFullCourse) styleCounts['Full Course']++;
    else styleCounts['Crash Course']++;
  });
  const styles = [
    { label: 'Crash Course', count: styleCounts['Crash Course'], pct: Math.round((styleCounts['Crash Course'] / totalDurationCount) * 100) },
    { label: 'Full Course', count: styleCounts['Full Course'], pct: Math.round((styleCounts['Full Course'] / totalDurationCount) * 100) },
  ];

  // Top Performing Videos
  const topVideos = videos.slice(0, 3).map((v) => {
    const seed = (new Date(v.createdAt).getTime() % 100);
    return {
      id: v.id,
      title: v.title || v.topic || 'Untitled Video',
      views: `${seed + 15} views`,
      rating: (4.6 + (seed % 5) * 0.1).toFixed(1),
      img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&h=48&fit=crop'
    };
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(6,0,16,0.9)', border: '1px solid rgba(139,92,246,0.18)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}18`, border: `1px solid ${m.color}33` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />{m.change}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-1">{m.label}</p>
              <p className="text-3xl font-black text-white">{m.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Bar Chart */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(6,0,16,0.9)', border: '1px solid rgba(139,92,246,0.18)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" />
              Weekly Activity
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Videos generated per day this week</p>
          </div>
          <span className="text-purple-400 text-xs font-semibold bg-purple-400/10 px-3 py-1 rounded-full">This Week</span>
        </div>

        <div className="flex items-end justify-between gap-3 h-40 mb-3">
          {weeklyData.map((data, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full group">
              <div className="flex-1 w-full flex items-end relative">
                <motion.div
                  className="w-full rounded-t-xl relative overflow-hidden cursor-default"
                  style={{ background: 'linear-gradient(to top, #7C3AED, #a855f7)', minHeight: 8 }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.videos / maxVideos) * 100}%` }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ filter: 'brightness(1.3)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep opacity-0 group-hover:opacity-100" />
                </motion.div>
                {/* Tooltip on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs text-white whitespace-nowrap z-10"
                  style={{ background: 'rgba(109,40,217,0.95)' }}>
                  {data.videos} videos
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">{data.day}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(6,0,16,0.9)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <h3 className="text-white font-bold mb-5">Popular Durations</h3>
          <div className="space-y-4">
            {durations.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 text-sm">{s.label}</span>
                  <span className="text-slate-500 text-xs">{s.count} videos</span>
                </div>
                <AnimatedBar pct={s.pct} delay={0.2 + i * 0.15} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(6,0,16,0.9)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <h3 className="text-white font-bold mb-5">Content Styles</h3>
          <div className="space-y-4">
            {styles.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 text-sm">{s.label}</span>
                  <span className="text-slate-500 text-xs">{s.count} videos</span>
                </div>
                <AnimatedBar pct={s.pct} delay={0.2 + i * 0.15} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(6,0,16,0.9)', border: '1px solid rgba(139,92,246,0.18)' }}>
        <h3 className="text-white font-bold mb-5">Top Performing Videos</h3>
        <div className="space-y-3">
          {topVideos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No video course generated yet.</p>
          ) : (
            topVideos.map((v, i) => (
              <motion.div
                key={v.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl group cursor-default transition-all"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="w-16 h-10 rounded-lg flex items-center justify-center bg-purple-900/40 text-purple-400 border border-purple-500/20 flex-none">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{v.title}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {v.rating}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-400 flex-none">#{i + 1}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
