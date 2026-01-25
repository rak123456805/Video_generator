import { useState } from 'react';
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

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'signin':
        return <SignInPage onNavigate={setCurrentPage} />;
      case 'signup':
        return <SignUpPage onNavigate={setCurrentPage} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigate={setCurrentPage} />;
      case 'auth/callback':
        return <AuthCallbackPage onNavigate={setCurrentPage} />;
      case 'dashboard':
        return (
          <ProtectedRoute onNavigate={setCurrentPage}>
            <DashboardPage onNavigate={setCurrentPage} />
          </ProtectedRoute>
        );
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <VideoProvider>
            <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
              {renderPage()}
            </div>
          </VideoProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}
