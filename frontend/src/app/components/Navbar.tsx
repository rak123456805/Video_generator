import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Menu, X, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  const navLinks = user
    ? [
        { label: 'Home', page: 'home' },
        { label: 'Dashboard', page: 'dashboard' }
      ]
    : [
        { label: 'Home', page: 'home' },
        { label: 'Features', page: 'home' },
        { label: 'Solutions', page: 'home' },
        { label: 'How It Works', page: 'home' },
        { label: 'Pricing', page: 'home' },
      ];

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled || isAuthPage ? 'rgba(2, 6, 23, 0.88)' : 'transparent',
          backdropFilter: scrolled || isAuthPage ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled || isAuthPage ? 'blur(20px)' : 'none',
          borderBottom: scrolled || isAuthPage ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-all duration-300">
              <Sparkles className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">
              AI<span className="gradient-text-purple">EduVideo</span>
            </span>
          </button>

          {/* Desktop Nav Links — only on non-auth pages */}
          {!isAuthPage && (
            <nav className="hidden lg:flex items-center gap-7 px-8 py-2.5 rounded-full backdrop-blur-xl bg-white/[0.04] border border-white/[0.12] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => onNavigate(link.page)}
                  className="text-sm font-medium text-slate-200 hover:text-white transition-colors duration-200 whitespace-nowrap relative group"
                >
                  {link.label}
                  <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500 group-hover:w-full transition-all duration-300 rounded-full" />
                </button>
              ))}
            </nav>
          )}

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthPage ? (
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            ) : user ? (
              <>
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md bg-purple-500/10 border border-purple-500/20">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-200 max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('signin')}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200"
                >
                  Login
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onNavigate('signup')}
                  className="px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wider uppercase text-white bg-gradient-to-r from-[#6E3EF3] via-[#8545FF] to-[#9148FF] border-2 border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.8)] transition-all duration-300"
                >
                  Get Started
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile Menu Button — non auth page */}
          {!isAuthPage && (
            <button
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && !isAuthPage && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(24px)' }}
          >
            <div className="flex flex-col h-full pt-28 px-8 pb-8 gap-4">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => { onNavigate(link.page); setMobileOpen(false); }}
                  className="text-left text-2xl font-bold text-white hover:text-purple-400 transition-colors py-3 border-b border-white/10"
                >
                  {link.label}
                </motion.button>
              ))}
              <div className="mt-auto flex flex-col gap-3">
                {user ? (
                  <button onClick={handleSignOut} className="w-full py-4 rounded-2xl text-red-400 border border-red-500/30 font-semibold">
                    Sign Out
                  </button>
                ) : (
                  <>
                    <button onClick={() => { onNavigate('signin'); setMobileOpen(false); }}
                      className="w-full py-4 rounded-2xl text-white border border-white/20 font-semibold">
                      Login
                    </button>
                    <button onClick={() => { onNavigate('signup'); setMobileOpen(false); }}
                      className="w-full py-4 rounded-2xl text-white font-bold tracking-wider uppercase bg-gradient-to-r from-[#6E3EF3] to-[#9148FF] border-2 border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}