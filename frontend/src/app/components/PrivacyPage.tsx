import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, FileText, Mail, Sparkles, HardDrive, Eye } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PrivacyPageProps {
  onNavigate: (page: string) => void;
}

export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  useEffect(() => {
    // Set basic page metadata
    document.title = "Privacy Policy | AI Text to Video Generator";
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const sections = [
    {
      id: "introduction",
      title: "1. Privacy Policy Overview",
      icon: Shield,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          Welcome to the <strong>AI Text to Video Generator</strong>. We respect your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, store, share, and protect your information when you use our application to generate video content, configure settings, or connect to third-party integrations like Google Drive.
        </p>
      )
    },
    {
      id: "information-collection",
      title: "2. Information We Collect",
      icon: FileText,
      content: (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>We collect information required to deliver the core functionalities of the AI Text to Video Generator. This includes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account & Authentication:</strong> Sign-up credentials (name, email, and password) provided when creating an account.</li>
            <li><strong>User-Generated Prompts:</strong> Text topics, scripts, and customization prompts entered to generate videos.</li>
            <li><strong>Integration Credentials:</strong> OAuth authorization tokens and connection emails when you connect your Google Drive account.</li>
          </ul>
        </div>
      )
    },
    {
      id: "auth-information",
      title: "3. Account and Authentication Information",
      icon: Lock,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          Our application uses <strong>Supabase</strong> for user registration, login, and secure session management. When you sign up, your email address and password are encrypted and managed directly through Supabase. We do not store plain-text passwords or expose Supabase authentication keys to the frontend.
        </p>
      )
    },
    {
      id: "user-generated-content",
      title: "4. User-Generated Content",
      icon: Sparkles,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          All text input, topics, configurations, and generated video scripts are saved temporarily on the backend server to complete the audio recording and video compilation pipeline. The compiled MP4 videos are held securely in your private user space.
        </p>
      )
    },
    {
      id: "google-access",
      title: "5. Google Account and Google Drive Access",
      icon: HardDrive,
      content: (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>
            You may optionally choose to connect your Google Drive account to automatically export and store your generated courses and videos.
          </p>
          <p>
            This connection is established only after you explicitly click <strong>"Connect Google Drive"</strong> in your settings tab and complete the Google OAuth authorization flow. We request the minimum permissions required to perform file uploads:
          </p>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl font-mono text-purple-300 text-xs">
            https://www.googleapis.com/auth/drive.file
          </div>
          <p>
            This scope allows our application to <strong>only view, create, edit, and delete files that were created or opened by this specific app</strong>. We do not have access to any other folders or private files in your Google Drive.
          </p>
        </div>
      )
    },
    {
      id: "how-we-use-drive",
      title: "6. How We Use Google Drive Data",
      icon: Eye,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          Our application uses Google Drive access solely to:
          <br />
          1. Create a dedicated folder (e.g., <code className="text-purple-300">TextToVideo</code>) in your Google Drive.
          <br />
          2. Upload compiled MP4 courses/videos generated through the app directly to that folder.
          <br />
          3. Retrieve the download and viewing links of these uploaded files to display them under your dashboard library.
        </p>
      )
    },
    {
      id: "file-storage",
      title: "7. Google Drive File Storage",
      icon: HardDrive,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          Once uploaded, your video files are saved directly in your personal Google Drive account. This ensures you maintain full ownership and control of your files. They will remain there until you manually delete them from your Drive or disconnect the application.
        </p>
      )
    },
    {
      id: "data-isolation",
      title: "8. Data Isolation Between Users",
      icon: Lock,
      content: (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>
            The application is built on a strict multi-tenant architecture to prevent cross-user data leaks.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>User A</strong> → Authenticated via User ID A → Links Google Drive Account A → Uploads to Folder A.</li>
            <li><strong>User B</strong> → Authenticated via User ID B → Links Google Drive Account B → Uploads to Folder B.</li>
          </ul>
          <p>
            Our backend enforces token and user ID checks on all endpoints. One user cannot view, list, download, or access the generated videos or Google Drive connections of another user.
          </p>
        </div>
      )
    },
    {
      id: "ai-processing",
      title: "9. AI Processing (Gemini API)",
      icon: Sparkles,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          We use Google's Gemini models to generate educational video scripts, slide descriptions, and structured quizzes from the topics you enter. When you launch a generation, your prompt is sent to Google's API to construct the script. No submitted prompt data is used to train public AI models.
        </p>
      )
    },
    {
      id: "security",
      title: "10. Data Storage and Security",
      icon: Shield,
      content: (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>We deploy standard security protocols to guard your information:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Encryption in Transit:</strong> All communication between the frontend, backend, Supabase, and Google APIs uses secure HTTPS connections.</li>
            <li><strong>Token Security:</strong> Google OAuth refresh tokens are encrypted on our server-side using AES-256-GCM before storage. They are never sent to the client browser.</li>
            <li><strong>Access Controls:</strong> Server endpoints require a valid JWT signature to restrict query execution to the legitimate user.</li>
          </ul>
        </div>
      )
    },
    {
      id: "third-party",
      title: "11. Third-Party Services",
      icon: FileText,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          We share data with third parties only when essential to perform services you request. These third parties include <strong>Supabase</strong> (for account management and data storage) and <strong>Google Workspace APIs</strong> (for video exports). We do not rent or sell your account data, prompts, or video files to advertisers or third-party marketers.
        </p>
      )
    },
    {
      id: "retention",
      title: "12. Data Retention and Deletion",
      icon: Lock,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          Your account details, history of course topics, and Drive metadata are saved on the server while your account remains active. You can request full deletion of your user account and linked metadata by reaching out to our developer support team.
        </p>
      )
    },
    {
      id: "disconnect",
      title: "13. Disconnecting Google Drive",
      icon: HardDrive,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          You can revoke Google Drive integration at any time by navigating to <strong>Dashboard → Settings</strong> and clicking <strong>"Disconnect Google Drive"</strong>. This triggers the server to delete the encrypted refresh tokens from our database and invalidates the OAuth token at Google. Your existing videos in Drive will remain completely untouched.
        </p>
      )
    },
    {
      id: "user-rights",
      title: "14. User Rights",
      icon: FileText,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          You have the right to access, export, update, or request deletion of any personal data stored on our servers. Since we only save data required to manage your dashboard and Google Drive connections, you can view your active connections and delete them directly from the web interface.
        </p>
      )
    },
    {
      id: "children-privacy",
      title: "15. Children's Privacy",
      icon: Shield,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          The AI Text to Video Generator is intended for general student and educator audiences. We do not knowingly collect personal identifiable information from children under 13. If you become aware that a child has shared credentials, please contact us immediately so we can remove their information.
        </p>
      )
    },
    {
      id: "changes-policy",
      title: "16. Changes to This Privacy Policy",
      icon: FileText,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          We may update this policy periodically to reflect changes in our integrations or data protection requirements. When updates occur, we will adjust the date listed at the top of this page. We encourage you to review the policy regularly to stay informed.
        </p>
      )
    },
    {
      id: "contact",
      title: "17. Contact Information",
      icon: Mail,
      content: (
        <p className="text-slate-300 leading-relaxed text-sm">
          If you have any questions, concerns, or requests regarding this Privacy Policy, your data, or your Google Drive permissions, please contact our support team at:
          <br />
          <a href="mailto:hnrakshith4@gmail.com" className="text-purple-400 hover:text-purple-300 transition-colors font-medium mt-1 inline-block font-sans">
            hnrakshith4@gmail.com
          </a>
        </p>
      )
    }
  ];

  return (
    <div className="min-h-screen text-white bg-slate-950 overflow-x-hidden font-sans selection:bg-purple-500 selection:text-white">
      <Navbar currentPage="privacy" onNavigate={onNavigate} />

      {/* Hero Header */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-purple-500/10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 mb-4"
          >
            <Shield className="w-3.5 h-3.5" /> Privacy & Security Shield
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight"
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed"
          >
            Last Updated: August 26, 2026. This policy explains how AI Text to Video Generator handles and secures your user credentials and Google Drive data.
          </motion.p>
        </div>
      </section>

      {/* Main Content Body */}
      <section className="py-16 max-w-4xl mx-auto px-6">
        <div className="space-y-8">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="p-6 rounded-2xl bg-[#0d041c]/60 border border-purple-500/10 shadow-lg"
              >
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide">{section.title}</h2>
                </div>
                <div>{section.content}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
