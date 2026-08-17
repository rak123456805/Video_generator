import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Video, FileVideo, BarChart3, Settings, Brain, User, LogOut, Sparkles, ChevronRight } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useVideo } from '../contexts/VideoContext';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (page: string) => void;
}

export function DashboardSidebar({ activeTab, onTabChange, onNavigate }: DashboardSidebarProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { signOut } = useAuth();
  const { clearVideoData } = useVideo();

  const handleSignOut = async () => {
    clearVideoData();
    await signOut();
    onNavigate('home');
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview' },
    { id: 'generate', icon: Video, label: 'Generate Video', description: 'Create new' },
    { id: 'videos', icon: FileVideo, label: 'My Videos', description: 'Library' },
    { id: 'quiz', icon: Brain, label: 'Quiz Mode', description: 'Test knowledge' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', description: 'Performance' },
    { id: 'settings', icon: Settings, label: 'Settings', description: 'Preferences' },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-64 h-[calc(100vh-65px)] sticky top-[65px] flex flex-col flex-shrink-0"
      style={{
        background: 'rgba(7,1,20,0.95)',
        borderRight: '1px solid rgba(139,92,246,0.15)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Navigation Menu */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="mb-4 px-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600">Navigation</p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onTabChange(item.id)}
                className="w-full group relative"
              >
                {/* Active indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(109,40,217,0.2), rgba(79,20,180,0.15))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        boxShadow: '0 0 20px rgba(109,40,217,0.15)',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                }`}>
                  {/* Icon container */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-600/30 text-purple-400'
                      : 'group-hover:bg-white/8 text-slate-500 group-hover:text-slate-300'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Label */}
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium leading-tight ${isActive ? 'text-white' : ''}`}>
                      {item.label}
                    </div>
                    <div className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-purple-400' : 'text-slate-600 group-hover:text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>

                  {/* Active arrow */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'rgba(139,92,246,0.1)' }} />

      {/* User Profile Bottom Section */}
      <div className="p-4">
        <div className="rounded-xl p-3 mb-3"
          style={{ background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </motion.button>
      </div>
    </motion.aside>
  );
}