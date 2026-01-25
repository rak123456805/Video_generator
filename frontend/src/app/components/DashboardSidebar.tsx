import { LayoutDashboard, Video, FileVideo, ChartBar, Settings, Brain, User, LogOut } from 'lucide-react';
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
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'generate', icon: Video, label: 'Generate Video' },
    { id: 'videos', icon: FileVideo, label: 'My Videos' },
    { id: 'quiz', icon: Brain, label: 'Quiz' },
    { id: 'analytics', icon: ChartBar, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 flex flex-col">
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-6 overflow-y-auto">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}