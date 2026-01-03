import { TrendingUp, Video, Clock, Users } from 'lucide-react';

export function AnalyticsSection() {
  const weeklyData = [
    { day: 'Mon', videos: 2 },
    { day: 'Tue', videos: 4 },
    { day: 'Wed', videos: 3 },
    { day: 'Thu', videos: 5 },
    { day: 'Fri', videos: 6 },
    { day: 'Sat', videos: 2 },
    { day: 'Sun', videos: 1 },
  ];

  const maxVideos = Math.max(...weeklyData.map((d) => d.videos));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Videos</p>
          <p className="text-3xl text-gray-900 dark:text-white">24</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Minutes</p>
          <p className="text-3xl text-gray-900 dark:text-white">720</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Views</p>
          <p className="text-3xl text-gray-900 dark:text-white">8.9k</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg. Rating</p>
          <p className="text-3xl text-gray-900 dark:text-white">4.8</p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl mb-6 text-gray-900 dark:text-white">
          Weekly Activity
        </h3>
        <div className="flex items-end justify-between gap-4 h-48">
          {weeklyData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-blue-600 rounded-t-lg transition-all hover:from-purple-700 hover:to-blue-700"
                  style={{
                    height: `${(data.videos / maxVideos) * 100}%`,
                    minHeight: '20px',
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">{data.day}</p>
                <p className="text-sm text-gray-900 dark:text-white">{data.videos}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl mb-4 text-gray-900 dark:text-white">
            Popular Durations
          </h3>
          <div className="space-y-3">
            {[
              { duration: '30 minutes', count: 12, percentage: 50 },
              { duration: '1 hour', count: 8, percentage: 33 },
              { duration: '15 minutes', count: 4, percentage: 17 },
            ].map((stat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {stat.duration}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.count} videos
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl mb-4 text-gray-900 dark:text-white">
            Content Styles
          </h3>
          <div className="space-y-3">
            {[
              { style: 'Lecture', count: 10, percentage: 42 },
              { style: 'Presentation', count: 9, percentage: 37 },
              { style: 'Animated', count: 5, percentage: 21 },
            ].map((stat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {stat.style}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.count} videos
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
