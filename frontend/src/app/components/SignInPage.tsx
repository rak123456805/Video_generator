import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Navbar } from './Navbar';
import { useAuth } from '../contexts/AuthContext';

interface SignInPageProps {
  onNavigate: (page: string) => void;
}

export function SignInPage({ onNavigate }: SignInPageProps) {
  const { signIn, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <Navbar currentPage="signin" onNavigate={onNavigate} />

      {/* Main Container — centered auth card, no footer */}
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md relative z-10 my-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 shadow-[0_0_25px_rgba(139,92,246,0.5)] mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400 text-sm">
              Sign in to your AI EduVideo account
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#0f051d]/90 border border-purple-500/30 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(124,58,237,0.25)] rounded-3xl p-8 md:p-10">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-purple-500/30 bg-black/60 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-purple-500/30 bg-black/60 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-purple-500/40 bg-black text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-400">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] text-white font-bold text-base shadow-[0_0_30px_rgba(144,106,243,0.5)] hover:shadow-[0_0_45px_rgba(144,106,243,0.8)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-5 h-5" />}
              </motion.button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="text-purple-400 font-bold hover:underline"
              >
                Sign up free
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}