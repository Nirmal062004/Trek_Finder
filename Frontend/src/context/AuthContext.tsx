'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, backendAPI } from '@/shared/services/api';

interface AuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    user: { id?: string; name: string; email: string } | null;
    login: () => Promise<void>;
    logout: () => void;
    loading: boolean;
    updateUser?: (data: { name?: string; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    login: async () => { },
    logout: () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState<{ id?: string; name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const verifyRes = await authAPI.verify();
            const apiUser = verifyRes?.user ?? null;
            if (apiUser) {
                setIsAuthenticated(true);
                    const name = apiUser.user_metadata?.name || apiUser.email?.split('@')[0] || 'User';
                    const email = apiUser.email || '';
                    // Persist id so UI components can scope localStorage per-user
                    setUser({ id: apiUser.id, name, email });

                // Secure Admin Check
                try {
                    const profile = await backendAPI.getUserProfile(apiUser.id);
                    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (e) {
                    console.error("Failed to fetch user profile for role check", e);
                    setIsAdmin(false);
                }
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            handleLogout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async () => {
        await checkAuth();

        // Check if user is on login/signup page and redirect home or requested page
        if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            router.push('/');
        }
    };

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }
        localStorage.removeItem('token');
        // Clear all other legacy items just in case
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        router.push('/login');
    };

    const updateUser = (data: { name?: string; email?: string }) => {
        setUser(prev => prev ? { ...prev, ...data } : data as any);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout: handleLogout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
