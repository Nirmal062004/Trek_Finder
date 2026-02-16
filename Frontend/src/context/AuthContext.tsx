'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/shared/services/api';

interface AuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    user: { name: string; email: string } | null;
    login: (name: string, isAdmin?: boolean, email?: string) => void;
    logout: () => void;
    loading: boolean;
    updateUser?: (data: { name?: string; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    login: () => { },
    logout: () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const savedAuth = localStorage.getItem('isAuthenticated');
            if (savedAuth === 'true') {
                try {
                    const verifyRes = await authAPI.verify();
                    const apiUser = verifyRes?.user ?? null;
                    if (apiUser) {
                        setIsAuthenticated(true);
                        const name = apiUser.user_metadata?.name || apiUser.email?.split('@')[0] || 'User';
                        const email = apiUser.email || '';
                        setUser({ name, email });

                        const savedAdmin = localStorage.getItem('isAdmin');
                        if (savedAdmin === 'true') setIsAdmin(true);
                    } else {
                        handleLogout();
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    handleLogout();
                }
            } else {
                handleLogout();
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = (name: string, isAdmin?: boolean, email?: string) => {
        setIsAuthenticated(true);
        setUser({ name, email: email || '' });
        if (isAdmin) setIsAdmin(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userName', name);
        if (email) localStorage.setItem('userEmail', email);
        if (isAdmin) localStorage.setItem('isAdmin', 'true');

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
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');

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
