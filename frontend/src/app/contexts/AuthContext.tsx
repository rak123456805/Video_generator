import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { useAppDispatch } from '../store/hooks';
import { setUser, clearUser, setLoading } from '../store/authSlice';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getRedirectUrl = (path: string): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://video-generator-seven-mu.vercel.app';
    return `${origin}${path}`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const [user, setUserState] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoadingState] = useState(true);

    useEffect(() => {
        // Get initial session
        dispatch(setLoading(true));
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                setUserState(session?.user ?? null);
                dispatch(setUser(session?.user ?? null));
                setLoadingState(false);
            })
            .catch((err) => {
                console.warn('Auth session check warning:', err);
                setLoadingState(false);
            });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUserState(session?.user ?? null);
            dispatch(setUser(session?.user ?? null));
            setLoadingState(false);
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    const signUp = async (email: string, password: string, fullName: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: getRedirectUrl('/auth/callback'),
                },
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signInWithOAuth = async (provider: 'google' | 'github') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: getRedirectUrl('/auth/callback'),
                },
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        dispatch(clearUser());
        // Clear video generation data from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentVideo');
            localStorage.removeItem('recentVideos');
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getRedirectUrl('/reset-password'),
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const updatePassword = async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signUp,
                signIn,
                signInWithOAuth,
                signOut,
                resetPassword,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
