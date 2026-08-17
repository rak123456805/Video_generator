import { useRef, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react';
import {
  Sparkles, Clock, ArrowRight, Zap, Shield,
  TrendingUp, Users, Play, CheckCircle2,
  Mic, Globe, BarChart3, Brain, Languages,
  ChevronRight, Star, Video, GraduationCap,
  Volume2, Cpu, Store, Building2, Check, X, PhoneCall,
  Lock, ArrowLeft, ArrowRight as ArrowRightIcon, RefreshCw, FileText
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

/* ── Scroll Progress Bar ── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="w-1.5 h-32 rounded-full overflow-hidden backdrop-blur-md bg-white/10 border border-purple-500/20">
        <motion.div
          className="w-full rounded-full origin-top"
          style={{
            scaleY: scrollYProgress,
            background: 'linear-gradient(to bottom, #8B5CF6, #6366F1, #D946EF)',
          }}
        />
      </div>
    </motion.div>
  );
}

/* ── Section fade-in ── */
function FadeIn({ children, delay = 0, direction = 'up', className = '' }: {
  children: ReactNode; delay?: number; direction?: 'up' | 'left' | 'right' | 'none'; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const variants = {
    up: { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
    none: { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } },
  };
  return (
    <motion.div
      ref={ref}
      variants={variants[direction]}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Counter ── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 50;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}


export function HomePage({ onNavigate }: HomePageProps) {
  const heroRef = useRef(null);
  const showcaseRef = useRef(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: showcaseScroll } = useScroll({
    target: showcaseRef,
    offset: ['start end', 'end start'],
  });

  const cardRotateX = useTransform(showcaseScroll, [0, 0.5, 1], [22, 5, -10]);
  const cardScale = useTransform(showcaseScroll, [0, 0.5, 1], [0.95, 1.04, 0.98]);

  /* Scroll Carousel Left/Right */
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  /* VocalLabs Bento Cards */
  const bentoCards = [
    {
      label: 'White-label',
      title: 'Your Brand, End to End.',
      desc: 'Your logo, domain, and colors across the video engine, dashboard, and quizzes. We stay completely invisible.',
      icon: Sparkles,
      span: 'col-span-1',
    },
    {
      label: 'Reliability',
      title: '99.9% Rendering Uptime.',
      desc: 'Global cloud redundancy and automatic failover on every video render — so you can publish with confidence.',
      icon: Shield,
      span: 'col-span-1',
    },
    {
      label: 'Multi-tenant',
      title: 'Manage Every Course & Student.',
      desc: 'One unified console to provision, monitor, and manage all your educational courses and students securely.',
      icon: Users,
      span: 'col-span-1 md:col-span-2 lg:col-span-1',
    },
    {
      label: 'Custom Lengths',
      title: '15, 30, or 60 Minute Courses.',
      desc: 'Flexibly select exact course duration and structure tailored to your exact curriculum needs.',
      icon: Clock,
      span: 'col-span-1 md:col-span-2 lg:col-span-1',
    },
    {
      label: 'Fast Launch',
      title: 'Go Live in Minutes.',
      desc: 'Onboard, brand, and start generating video courses without building AI infrastructure yourself.',
      icon: Zap,
      span: 'col-span-1',
    },
    {
      label: 'Scale',
      title: 'Thousands of Concurrent Videos.',
      desc: 'Auto-scales smoothly — from a single course render to thousands, with zero server setup.',
      icon: Globe,
      span: 'col-span-1',
    },
  ];

  /* Reliable Scalable Yours Carousel Cards */
  const carouselCards = [
    {
      tag: 'Multi-Language Telephony',
      title: 'Voices in 30+ countries, under your brand.',
      img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop&q=80',
    },
    {
      tag: 'Partner-Ready',
      title: 'Launch fast with branded instructor dashboards.',
      img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80',
    },
    {
      tag: 'Model Routing',
      title: 'Best-in-class AI models on every course.',
      img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=400&fit=crop&q=80',
    },
    {
      tag: 'Automated Testing',
      title: 'Tested & verified before every course go-live.',
      img: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop&q=80',
    },
    {
      tag: 'Traffic Splitting',
      title: 'Split rendering across AI providers in real time.',
      img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop&q=80',
    },
  ];

  /* Security Certifications */
  const securityBadges = [
    { title: 'SOC 2 Type II', subtitle: 'Certified Security' },
    { title: 'ISO 27001', subtitle: 'Information Security' },
    { title: 'GDPR', subtitle: 'EU Compliance' },
    { title: 'HIPAA', subtitle: 'Health Data Compliant' },
    { title: 'PCI-DSS Level 1', subtitle: 'Payment Security' },
    { title: 'CCPA', subtitle: 'Privacy Shield' },
    { title: '256-bit AES', subtitle: 'End-to-End Encryption' },
  ];

  return (
    <div className="min-h-screen text-white bg-slate-950 overflow-x-hidden font-sans selection:bg-purple-500 selection:text-white">
      <ScrollProgress />
      <Navbar currentPage="home" onNavigate={onNavigate} />

      {/* ══════════════════════════════════════════════════════
          1. HERO SECTION — VocalLabs Background Video & Hero
          ══════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative h-screen w-full overflow-hidden bg-black text-white flex items-center justify-center"
      >
        {/* Background video layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            className="w-full h-full object-cover scale-[1.08] filter brightness-90 contrast-110"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260510_060007_60275ce7-030c-4668-a160-8f364ec537d3.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>

        {/* Dark Vignette Overlay */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.7) 0%, rgba(2,6,23,0.3) 40%, rgba(2,6,23,0.85) 100%)',
          }}
        />

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center pt-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold uppercase tracking-widest text-purple-300 backdrop-blur-xl bg-purple-500/10 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            THE WHITE-LABEL AI VIDEO PLATFORM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.08] tracking-tight"
          >
            Turn Text into{' '}
            <span className="inline-block bg-gradient-to-r from-[#9F7AEA] via-[#C084FC] to-[#6331E8] bg-clip-text text-transparent animate-gradient-flash">
              AI Video
            </span>{' '}
            Courses.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-2xl text-slate-200 mb-12 max-w-3xl mx-auto font-normal leading-relaxed text-shadow-sm"
          >
            Rebrand it, structure it, publish video courses effortlessly. You own the students &amp; content — our AI engine powers every video frame.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-5 justify-center items-center"
          >
            {/* Primary Button — Deep Purple Breathing Halo Glow */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-breathe-glow" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate('dashboard')}
                className="relative flex items-center justify-center gap-3 px-9 py-4 bg-gradient-to-r from-[#1a0a2e]/95 via-[#16082a]/95 to-[#0f051d]/95 backdrop-blur-xl border border-purple-500/40 rounded-full text-white font-bold text-lg shadow-[0_0_35px_rgba(124,58,237,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_0_55px_rgba(124,58,237,0.7)] hover:border-purple-400/60 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
                </span>
                <span className="relative z-10 flex items-center gap-3">
                  <span>Try Demo Live</span>
                  <PhoneCall className="w-5 h-5 text-purple-400" />
                </span>
              </motion.button>
            </div>

            {/* Secondary Button — Solid White Pill */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate('signup')}
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full text-lg font-bold bg-white text-slate-950 hover:bg-slate-100 transition-all duration-300 shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. THREE CARDS PIPELINE BANNER (VocalLabs Flow)
          ══════════════════════════════════════════════════════ */}
      <section className="w-full bg-slate-950 py-20 px-6 relative border-t border-b border-purple-500/10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-3">
            {/* Card 1 */}
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl backdrop-blur-xl px-7 py-7 w-full max-w-xs bg-[#0f051d]/60 border border-purple-500/20 shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-purple-300 border border-purple-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AIEduVideo Engine</h3>
              <p className="text-sm text-slate-400 leading-snug">We build &amp; power the course video AI</p>
            </div>

            <div className="text-purple-400/60 shrink-0">
              <ArrowRight className="hidden md:block w-7 h-7" />
            </div>

            {/* Card 2 (Partner/Educator Highlighted) */}
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl backdrop-blur-xl px-7 py-7 w-full max-w-xs bg-[#150a2e]/80 border border-purple-400/50 shadow-[0_0_40px_rgba(124,58,237,0.35)]">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] text-white shadow-md">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Our Partners &amp; Teachers</h3>
              <p className="text-sm text-slate-300 leading-snug">Rebrand it, price it, sell it as their own</p>
            </div>

            <div className="text-purple-400/60 shrink-0">
              <ArrowRight className="hidden md:block w-7 h-7" />
            </div>

            {/* Card 3 */}
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl backdrop-blur-xl px-7 py-7 w-full max-w-xs bg-[#0f051d]/60 border border-purple-500/20 shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-purple-300 border border-purple-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">End Students &amp; Learners</h3>
              <p className="text-sm text-slate-400 leading-snug">Courses run on it seamlessly every day</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. 3D TILT SHOWCASE SECTION ("Your brand. Our AI video engine.")
          ══════════════════════════════════════════════════════ */}
      <section ref={showcaseRef} className="py-24 bg-[#020617] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Your brand.<br />
              <span className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-purple-100 to-indigo-300">
                Our AI video engine.
              </span>
            </h2>
          </FadeIn>

          {/* 3D Perspective Container */}
          <div className="w-full flex items-center justify-center" style={{ perspective: '1200px' }}>
            <motion.div
              style={{
                rotateX: cardRotateX,
                scale: cardScale,
                transformStyle: 'preserve-3d',
              }}
              className="w-full max-w-5xl rounded-[32px] p-[3px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient-rotate shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_50px_rgba(139,92,246,0.3)] transition-transform duration-300 ease-out"
            >
              <div className="w-full bg-[#0a0314] rounded-[29px] overflow-hidden p-6 md:p-8">
                {/* Simulated Generator Header */}
                <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-purple-500/20 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-2 text-xs font-bold text-slate-400">AIEduVideo Generator Console v2.4</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Engine Operational
                    </span>
                  </div>
                </div>

                {/* Generator Body */}
                <div className="grid lg:grid-cols-3 gap-6 pt-6 items-center">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
                        Input Course Topic or Script
                      </label>
                      <div className="text-slate-200 text-sm font-mono bg-black/40 p-3 rounded-lg border border-purple-500/20">
                        "Introduction to Machine Learning: Supervised vs Unsupervised Learning, Neural Networks &amp; AI Ethics..."
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-purple-400 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-300">AI Sound &amp; Voiceover Visualizer</span>
                      </div>
                      <div className="flex items-center gap-1 h-6">
                        {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 50, 85, 40].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ['20%', `${h}%`, '20%'] }}
                            transition={{ duration: 1.2 + (i % 3) * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-1 rounded-full bg-gradient-to-t from-purple-600 to-pink-500"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-purple-500/40 relative aspect-video bg-black shadow-2xl group">
                    <img
                      src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=400&fit=crop&q=85"
                      alt="AI Video preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.8)] group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 ml-0.5" />
                      </div>
                      <span className="mt-3 text-xs font-bold text-white">Preview Generated Video</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. BENTO GRID FEATURES (VocalLabs Style)
          ══════════════════════════════════════════════════════ */}
      <section id="features" className="bg-slate-950 py-24 border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-500/30 mb-4">
              FEATURES &amp; CAPABILITIES
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4">
              Everything You Need to <span className="gradient-text-purple">Scale.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bentoCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -6 }}
                  className={`rounded-3xl p-8 bg-[#060010] border border-purple-500/20 hover:border-purple-500/60 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${card.span}`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 block">
                      {card.label}
                    </span>
                    <h3 className="text-2xl font-bold text-white mb-3">{card.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="mt-8 flex items-center gap-1 text-xs font-semibold text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn capability <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. CAROUSEL ("Reliable. Scalable. Yours.")
          ══════════════════════════════════════════════════════ */}
      <section className="bg-black py-24 border-t border-purple-500/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2">
              Reliable. Scalable. <span className="gradient-text-purple">Yours.</span>
            </h2>
            <p className="text-slate-400 text-base">Built for educators and platforms that demand enterprise stability.</p>
          </div>

          {/* Left/Right Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollCarousel('left')}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-purple-600/30 flex items-center justify-center text-white transition-all"
              aria-label="Scroll left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-purple-600/30 flex items-center justify-center text-white transition-all"
              aria-label="Scroll right"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div
          ref={carouselRef}
          className="flex gap-6 px-6 max-w-7xl mx-auto overflow-x-auto scroll-smooth py-4 [scrollbar-width:none]"
        >
          {carouselCards.map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8, scale: 1.02 }}
              className="flex-none w-80 md:w-[380px] h-[400px] rounded-3xl overflow-hidden relative bg-[#090214] border border-purple-500/30 shadow-2xl cursor-pointer group"
            >
              <img
                src={card.img}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-2">
                  {card.tag}
                </span>
                <h3 className="text-2xl font-bold text-white leading-snug">{card.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. ENTERPRISE & SECURITY BADGES SECTION
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-950 border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Enterprise &amp; Security</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12">
              Your course data and student privacy are our top priority. We maintain the highest standards of compliance.
            </p>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 justify-center">
              {securityBadges.map((badge, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.06, y: -4 }}
                  className="rounded-2xl p-4 bg-[#0d041c] border border-purple-500/20 flex flex-col items-center justify-center text-center shadow-lg hover:border-purple-500/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">{badge.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{badge.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. FLOATING COOKIE NOTICE
          ══════════════════════════════════════════════════════ */}
      <CookieNotice />

      {/* ══════════════════════════════════════════════════════
          8. FOOTER
          ══════════════════════════════════════════════════════ */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}