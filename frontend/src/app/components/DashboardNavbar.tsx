import { motion } from 'motion/react';
import { Bell, LogOut, User, Sparkles, Settings } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useVideo } from '../contexts/VideoContext';

interface DashboardNavbarProps {
  onNavigate: (page: string) => void;
}

export function DashboardNavbar({ onNavigate }: DashboardNavbarProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { signOut } = useAuth();
  const { clearVideoData } = useVideo();

  const handleSignOut = async () => {
    clearVideoData();
    await signOut();
    onNavigate('home');
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 glass-nav"
    >
      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-purple-500/40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-tight tracking-tight">
              AI<span className="gradient-text-purple">EduVideo</span>
            </span>
            <p className="text-[10px] text-slate-500 leading-none">Dashboard</p>
          </div>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-200"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'rgba(139,92,246,1)' }} />
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
          </motion.button>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: 'rgba(139,92,246,0.2)' }} />

          {/* User Avatar */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5"
            style={{ border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{displayName}</p>
              <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[120px]">{user?.email}</p>
            </div>
          </div>

          {/* Sign Out */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}