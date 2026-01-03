import { Video, Bell, LogOut, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface DashboardNavbarProps {
  onNavigate: (page: string) => void;
}

export function DashboardNavbar({ onNavigate }: DashboardNavbarProps) {
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
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
            <span className="text-sm text-gray-700 dark:text-gray-300">John Doe</span>
          </div>
          
          <ThemeToggle />
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </nav>
  );
}