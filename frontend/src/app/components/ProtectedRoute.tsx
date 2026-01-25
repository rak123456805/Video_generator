import { ReactNode, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    onNavigate: (page: string) => void;
}

export function ProtectedRoute({ children, onNavigate }: ProtectedRouteProps) {
    const { user, loading, isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // Redirect if not authenticated after loading completes
        if (!loading && !isAuthenticated) {
            onNavigate('signin');
        }
    }, [loading, isAuthenticated, onNavigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // Don't render children if not authenticated
    if (!isAuthenticated || !user) {
        return null;
    }

    return <>{children}</>;
}
