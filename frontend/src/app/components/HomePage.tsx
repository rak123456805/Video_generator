import { Sparkles, Clock, GraduationCap, Video, ArrowRight, Zap, Shield, TrendingUp, Users, Play, CheckCircle2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const features = [
    {
      icon: Sparkles,
      title: 'Text to Video AI',
      description: 'Transform your educational content into engaging AI-powered video courses instantly.',
    },
    {
      icon: Clock,
      title: 'Custom Duration Control',
      description: 'Choose between 15, 30, or 60-minute video courses tailored to your needs.',
    },
    {
      icon: GraduationCap,
      title: 'Educational Course Creation',
      description: 'Create professional learning experiences with our advanced AI technology.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <Navbar currentPage="home" onNavigate={onNavigate} />
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">AI-Powered Video Generation</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl mb-6 text-gray-900 dark:text-white">
            Turn Text into{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI-Powered Video Courses
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Create engaging educational videos in minutes. Our AI transforms your text into 
            professional video courses with customizable durations and styles.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-4 rounded-lg border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              Generate Video
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Educators
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to create professional educational content
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-12 md:p-16 text-white">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose AI EduVideo?
            </h2>
            <p className="text-xl text-blue-100">
              Join thousands of educators transforming their teaching with AI-powered video generation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Zap, title: 'Lightning Fast', description: 'Generate videos in minutes, not hours' },
              { icon: Shield, title: 'Secure & Private', description: 'Your content is protected and safe' },
              { icon: TrendingUp, title: 'Better Engagement', description: 'Increase student participation' },
              { icon: Users, title: 'Trusted by Educators', description: '10,000+ active users worldwide' },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-blue-100">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create professional video courses in three simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Input Your Content',
              description: 'Paste or type your educational content into our intelligent text editor. No formatting required.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              step: '2',
              title: 'Choose Your Style',
              description: 'Select video duration (15, 30, or 60 minutes) and presentation style that fits your needs.',
              color: 'from-purple-500 to-purple-600',
            },
            {
              step: '3',
              title: 'Generate & Share',
              description: 'Click generate and let AI create your video course. Download or share directly with students.',
              color: 'from-indigo-500 to-indigo-600',
            },
          ].map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 text-white text-2xl font-bold`}>
                  {step.step}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
              {index < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 md:p-16 border border-gray-200 dark:border-gray-700">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Perfect for Every Educator
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Whether you're a teacher, professor, or online course creator, AI EduVideo helps you deliver engaging content that resonates with your students.
              </p>
              
              <div className="space-y-4">
                {[
                  'Create unlimited video courses',
                  'Multiple presentation styles',
                  'High-quality AI narration',
                  'Customizable video lengths',
                  'Easy sharing and downloads',
                  'Real-time generation tracking',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-white text-lg font-semibold">Watch Demo Video</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of educators creating engaging video content with AI. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('signup')}
              className="px-10 py-4 rounded-lg bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-all hover:shadow-xl flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('signin')}
              className="px-10 py-4 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}