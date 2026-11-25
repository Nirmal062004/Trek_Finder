'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, backendAPI } from '@/shared/services/api';

interface AuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    user: { id?: string; name: string; email: string } | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    updateUser?: (data: { name?: string; email?: string }) => void;
}

type AuthUser = { id?: string; name: string; email: string };
type AuthSnapshot = { user: AuthUser | null; isAdmin: boolean; hasToken: boolean };

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    login: async () => { },
    logout: async () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState<{ id?: string; name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const handleLogout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        router.push('/login');
    }, [router]);

    const checkAuth = useCallback(async (): Promise<AuthSnapshot> => {
        const hasToken = Boolean(localStorage.getItem('token'));
        const verifyRes = await authAPI.verify();
        const apiUser = verifyRes?.user ?? null;
        if (!apiUser) return { user: null, isAdmin: false, hasToken };

        const authenticatedUser: AuthUser = {
            id: apiUser.id,
            name: apiUser.user_metadata?.name || apiUser.email?.split('@')[0] || 'User',
            email: apiUser.email || '',
        };
        let admin = false;
        try {
            const profile = await backendAPI.getUserProfile(apiUser.id);
            admin = profile?.role === 'admin' || profile?.role === 'superadmin';
        } catch (error) {
            console.error('Failed to fetch user profile for role check', error);
        }
        return { user: authenticatedUser, isAdmin: admin, hasToken };
    }, []);

    useEffect(() => {
        let active = true;
        const initializeAuth = async () => {
            try {
                const snapshot = await checkAuth();
                if (!active) return;
                if (snapshot.hasToken && !snapshot.user) {
                    await authAPI.logout();
                    router.push('/login');
                }
                setIsAuthenticated(Boolean(snapshot.user));
                setIsAdmin(snapshot.isAdmin);
                setUser(snapshot.user);
            } catch (error) {
                console.error('Auth check failed:', error);
                if (!active) return;
                await authAPI.logout();
                setIsAuthenticated(false);
                setIsAdmin(false);
                setUser(null);
                router.push('/login');
            } finally {
                if (active) setLoading(false);
            }
        };
        void initializeAuth();
        return () => { active = false; };
    }, [checkAuth, router]);

    const login = useCallback(async () => {
        const snapshot = await checkAuth();
        setIsAuthenticated(Boolean(snapshot.user));
        setIsAdmin(snapshot.isAdmin);
        setUser(snapshot.user);

        // Check if user is on login/signup page and redirect home or requested page
        if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            router.push('/');
        }
    }, [checkAuth, router]);

    const updateUser = (data: { name?: string; email?: string }) => {
        setUser((previous) => previous ? { ...previous, ...data } : null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout: handleLogout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
