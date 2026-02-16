'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/Signup.module.css';
import Navigation from '@/components/Navigation';
import { authAPI } from '@/shared/services/api';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
    const router = useRouter();
    const { login, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return false;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await authAPI.register({ email, password, name });
            if (response && response.user) {
                const user = response.user;
                const displayName = user.user_metadata?.name || name || user.email || '';
                const isAdmin = email === 'admin@test.com';
                login(displayName, isAdmin, email);
                router.push('/');
            } else {
                // Fallback
                const isAdmin = email === 'admin@test.com';
                login(name, isAdmin, email);
                router.push('/');
            }
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginClick = () => router.push('/login');

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
                    <source src="/assets/video/forest2.mp4" type="video/mp4" />
                </video>
                <div className={styles.visualOverlay}></div>

                <div className={styles.visualContent}>
                    <div className={styles.brandLogo}>
                        <Compass size={32} className={styles.logoIcon} />
                        <span className={styles.brandName}>TREK FINDER</span>
                    </div>
                    <h1 className={styles.visualTitle}>Start Your <br />Expedition.</h1>
                    <p className={styles.visualText}>
                        Create your profile, track your treks, and connect with fellow adventurers in your region.
                    </p>
                    <div className={styles.visualQuote}>
                        "In every walk with nature one receives far more than he seeks."
                    </div>
                </div>
            </div>

            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Join the Tribe</h2>
                        <p className={styles.subtitle}>Create your free account today</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errorMessage}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="name" className={styles.label}>Full Name</label>
                            <div className={styles.inputWrapper}>
                                <User className={styles.inputIcon} size={20} />
                                <input
                                    type="text"
                                    id="name"
                                    className={styles.input}
                                    placeholder="Sherlock Holmes"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

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
                                    placeholder="Create a secure password"
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

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Creating Account...' : <>Create Account <UserPlus size={20} /></>}
                        </button>
                    </form>

                    <div className={styles.divider}>Or</div>

                    <p className={styles.loginPrompt}>
                        Already have an account?
                        <button type="button" className={styles.loginLink} onClick={handleLoginClick}>
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
