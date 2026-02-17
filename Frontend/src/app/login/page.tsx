'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/Login.module.css';
import Navigation from '@/components/Navigation';
import { authAPI } from '@/shared/services/api';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Compass } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!email || !password) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }

            const response = await authAPI.login({ email, password });

            if (response.user) {
                await login();
                router.push('/');
            }
        } catch (err: any) {
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 100 }}>
                <Navigation activeNav={null} onNavChange={() => { }} locked={true} />
            </div>

            <div className={styles.visualSide}>
                <video
                    className={styles.videoBackground}
                    autoPlay
                    muted
                    loop
                    playsInline
                >
                    <source src="/assets/video/forest.mp4" type="video/mp4" />
                </video>
                <div className={styles.visualOverlay}></div>

                <div className={styles.visualContent}>
                    <div className={styles.brandLogo}>
                        <Compass size={32} className={styles.logoIcon} />
                        <span className={styles.brandName}>TREK FINDER</span>
                    </div>
                    <h1 className={styles.visualTitle}>Discover Your <br />Next Adventure.</h1>
                    <p className={styles.visualText}>
                        Join a community of explorers, find hidden trails, and share your journey with the world.
                    </p>
                    <div className={styles.visualQuote}>
                        "The journey of a thousand miles begins with a single step."
                    </div>
                </div>
            </div>

            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Welcome Back</h2>
                        <p className={styles.subtitle}>Sign in to continue your exploration</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errorMessage}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={20} />
                                <input
                                    type="email"
                                    id="email"
                                    className={styles.input}
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password" className={styles.label}>Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    className={styles.input}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* <div className={styles.forgotPassword}>
                            <a href="#forgot" className={styles.forgotLink}>Forgot Password?</a>
                        </div> */}

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Signing In...' : <>Sign In <LogIn size={20} /></>}
                        </button>
                    </form>

                    <div className={styles.divider}>Or</div>

                    <p className={styles.signupPrompt}>
                        New to Trek Finder?
                        <button type="button" className={styles.loginLink} onClick={() => router.push('/signup')}>
                            Create an Account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
