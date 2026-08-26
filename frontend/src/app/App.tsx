import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from './contexts/ThemeContext';
import { VideoProvider } from './contexts/VideoContext';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage } from './components/HomePage';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { DashboardPage } from './components/DashboardPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PrivacyPage } from './components/PrivacyPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/auth/callback') return 'auth/callback';
    if (path === '/privacy') return 'privacy';
    if (path === '/signin') return 'signin';
    if (path === '/signup') return 'signup';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/reset-password') return 'reset-password';
    if (path === '/dashboard') return 'dashboard';
    return 'home';
  });

  const navigate = (page: string) => {
    let path = '/';
    if (page === 'privacy') path = '/privacy';
    else if (page === 'signin') path = '/signin';
    else if (page === 'signup') path = '/signup';
    else if (page === 'dashboard') path = '/dashboard';
    else if (page === 'forgot-password') path = '/forgot-password';
    else if (page === 'reset-password') path = '/reset-password';
    else if (page === 'auth/callback') path = '/auth/callback';

    window.history.pushState({}, '', path);
    setCurrentPage(page);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/privacy') setCurrentPage('privacy');
      else if (path === '/signin') setCurrentPage('signin');
      else if (path === '/signup') setCurrentPage('signup');
      else if (path === '/dashboard') setCurrentPage('dashboard');
      else if (path === '/forgot-password') setCurrentPage('forgot-password');
      else if (path === '/reset-password') setCurrentPage('reset-password');
      else if (path === '/auth/callback') setCurrentPage('auth/callback');
      else setCurrentPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'signin':
        return <SignInPage onNavigate={navigate} />;
      case 'signup':
        return <SignUpPage onNavigate={navigate} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigate={navigate} />;
      case 'auth/callback':
        return <AuthCallbackPage onNavigate={navigate} />;
      case 'privacy':
        return <PrivacyPage onNavigate={navigate} />;
      case 'dashboard':
        return (
          <ProtectedRoute onNavigate={navigate}>
            <DashboardPage onNavigate={navigate} />
          </ProtectedRoute>
        );
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <VideoProvider>
            <div className="min-h-screen bg-slate-950 text-white transition-colors">
              {renderPage()}
            </div>
          </VideoProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}
