import { useState } from 'react';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardSidebar } from './DashboardSidebar';
import { GenerateVideoSection } from './GenerateVideoSection';
import { VideoGenerationStatus } from './VideoGenerationStatus';
import { RecentVideos } from './RecentVideos';
import { AnalyticsSection } from './AnalyticsSection';
import { QuizSection } from './QuizSection';
import { Video, TrendingUp, Clock, Calendar } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { videoData } = useVideo();

  const stats = [
    {
      icon: Video,
      label: 'Videos Generated',
      value: '24',
      change: '+12%',
      positive: true,
    },
    {
      icon: Clock,
      label: 'Minutes Created',
      value: '720',
      change: '+8%',
      positive: true,
    },
    {
      icon: TrendingUp,
      label: 'This Week',
      value: '8',
      change: '+24%',
      positive: true,
    },
    {
      icon: Calendar,
      label: 'This Month',
      value: '24',
      change: '+16%',
      positive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardNavbar onNavigate={onNavigate} />

      <div className="flex">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigate={onNavigate}
        />

        <main className="flex-1 p-8">
          {/* Dashboard Tab */}
          <div className={`space-y-8 ${activeTab === 'dashboard' ? 'block' : 'hidden'}`}>
            {/* Welcome Section */}
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                Welcome back! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create your next AI-powered video course
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span
                        className={`text-sm ${stat.positive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                          }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Video Generator */}
            <GenerateVideoSection />

            {/* Recent Videos */}
            <RecentVideos />
          </div>

          {/* Generate Tab */}
          <div className={`${activeTab === 'generate' ? 'block' : 'hidden'} space-y-8`}>
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                Generate Video
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create a new AI-powered video course
              </p>
            </div>
            <GenerateVideoSection />
          </div>

          {/* Videos Tab */}
          <div className={`${activeTab === 'videos' ? 'block' : 'hidden'} space-y-8`}>
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                My Videos
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage your generated videos
              </p>
            </div>
            <RecentVideos showAll />
          </div>

          {/* Analytics Tab */}
          <div className={`${activeTab === 'analytics' ? 'block' : 'hidden'} space-y-8`}>
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                Analytics
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Track your video creation performance
              </p>
            </div>
            <AnalyticsSection />
          </div>

          {/* Quiz Tab */}
          <div className={`${activeTab === 'quiz' ? 'block' : 'hidden'} space-y-8`}>
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                Quiz
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Test your knowledge with AI-generated quizzes
              </p>
            </div>
            <QuizSection
              topic={videoData.topic}
              scriptSlides={videoData.scriptSlides}
              language={videoData.language}
            />
          </div>

          {/* Settings Tab */}
          <div className={`${activeTab === 'settings' ? 'block' : 'hidden'} space-y-8`}>
            <div>
              <h2 className="text-3xl mb-2 text-gray-900 dark:text-white">
                Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account preferences
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">
                Settings panel coming soon...
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
