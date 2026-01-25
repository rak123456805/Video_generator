import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface AuthCallbackPageProps {
    onNavigate: (page: string) => void;
}

export function AuthCallbackPage({ onNavigate }: AuthCallbackPageProps) {
    const { user, loading } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        // Wait for auth to process
        if (!loading) {
            if (user) {
                setStatus('success');
                setTimeout(() => {
                    onNavigate('dashboard');
                }, 1000);
            } else {
                setStatus('error');
                setTimeout(() => {
                    onNavigate('signin');
                }, 2000);
            }
        }
    }, [user, loading, onNavigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Completing Sign In
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Please wait while we authenticate you...
                        </p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Success!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Redirecting to dashboard...
                        </p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Authentication Failed
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Redirecting to sign in...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
