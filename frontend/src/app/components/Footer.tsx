import { motion } from 'motion/react';
import { Mail, Twitter, Github, Linkedin, Sparkles, ArrowRight, Check } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Company: [
      { label: 'About Us', href: '#' },
      { label: 'Contact Us', href: '#' },
      { label: 'Pricing Policy', href: '#' },
      { label: 'Blogs', href: '#' },
      { label: 'Careers', href: '#' },
    ],
    Solutions: [
      { label: 'AI Narration Engine', href: '#' },
      { label: 'Automated Quizzes', href: '#' },
      { label: 'Multi-language Engine', href: '#' },
      { label: 'Course Analytics', href: '#' },
      { label: 'LMS Integration', href: '#' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms & Conditions', href: '#' },
      { label: 'Refund Policy', href: '#' },
      { label: 'Data Protection (DPA)', href: '#' },
    ],
  };

  const socials = [
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  return (
    <footer className="relative bg-black text-white overflow-hidden border-t border-purple-500/10">
      {/* Glow ambient spots */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl -translate-x-48 -translate-y-48 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl translate-x-48 translate-y-48 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-12">
        {/* Large VocalLabs-style CTA Banner */}
        <div className="bg-gradient-to-r from-[#0f1724]/70 via-[#1f1b3a]/50 to-[#0b1020]/70 rounded-3xl p-8 md:p-14 text-center relative overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-16">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl translate-x-20 translate-y-20" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">
              Ready to launch your own AI video courses?
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto font-normal">
              Book a live demo and see how AI EduVideo generates complete courses in minutes.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate?.('signup')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] text-white font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(144,106,243,0.5)] hover:shadow-[0_0_45px_rgba(144,106,243,0.8)] transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-1" />
            </motion.button>
          </div>
        </div>

        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight">
                AI<span className="gradient-text-purple">EduVideo</span>
              </h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              The AI video platform powering educators, platforms, and institutions worldwide. Rebrand it, create content, and publish seamlessly.
            </p>

            {/* Social Icons */}
            <div className="flex gap-3 pt-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={s.label}
                    className="w-10 h-10 bg-white/5 hover:bg-purple-600/30 rounded-xl flex items-center justify-center text-slate-400 hover:text-white border border-white/10 hover:border-purple-500/40 transition-all duration-300"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6">{section}</h4>
              <ul className="space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar with Status Indicator */}
        <div className="pt-8 border-t border-purple-500/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {currentYear} AI EduVideo Inc. All rights reserved.</p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>All Systems Operational (99.9% Uptime)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}