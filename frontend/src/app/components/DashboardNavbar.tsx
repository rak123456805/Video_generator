import { Video, Bell, LogOut, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
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

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="AI EduVideo Logo"
            className="w-12 h-12 object-contain bg-white p-1 rounded-lg shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI EduVideo
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Username Display */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>

          <ThemeToggle />
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}