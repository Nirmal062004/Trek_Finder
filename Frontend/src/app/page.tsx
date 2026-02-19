'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import homeStyles from '@/styles/Home.module.css';
import { Mountain, ArrowRight, Camera, Target, Zap, Shield, Users, MapPin, Ruler, Circle, Clock, Rocket, Mail, Github, Linkedin, Image as ImageIcon, Star } from 'lucide-react';
import { backendAPI } from '@/shared/services/api';

type Trek = any;

export default function HomePage() {
    const router = useRouter();

    const handleNavigate = (path: string) => {
        router.push(`/${path}`);
    };

    const [stats, setStats] = useState({ trails: 0, trekkers: 0 });
    const [topTreks, setTopTreks] = useState<Trek[]>([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const [treks, users] = await Promise.all([
                    backendAPI.getTreks().catch(() => []),
                    backendAPI.getUsers().catch(() => []),
                ]);

                if (!mounted) return;

                setStats({
                    trails: Array.isArray(treks) ? treks.length : 0,
                    trekkers: Array.isArray(users) ? users.length : 0,
                });

                // Choose top treks by rating or newest
                let picks = Array.isArray(treks) ? [...treks] : [];
                picks.sort((a: any, b: any) => {
                    const ra = (a.rating || a.avg_rating || 0);
                    const rb = (b.rating || b.avg_rating || 0);
                    return rb - ra;
                });
                setTopTreks(picks.slice(0, 4));
            } catch (e) {
                console.error('Failed to load home data', e);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    return (
        <div className={homeStyles['home-container']}>
            {/* Hero Section with Video Background */}
            <div className={homeStyles['home-bg']}>
                <div className={homeStyles['hero-content']}>
                    <div className={homeStyles['hero-badge']} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Mountain size={20} /> Explore India's Wilderness
                    </div>
                    <h1 className={homeStyles['hero-title']}>
                        Discover Your Next
                        <span className={homeStyles['hero-highlight']}> Adventure</span>
                    </h1>
                    <p className={homeStyles['hero-description']}>
                        From the Himalayas to the Western Ghats — {stats.trails} trails and {stats.trekkers} trekkers helping you choose the perfect route
                    </p>
                    <div className={homeStyles['hero-buttons']}>
                        <button
                            className={homeStyles['primary-button']}
                            onClick={() => handleNavigate('finder')}
                        >

                            <span>Start Exploring</span>
                            <span className={homeStyles['button-arrow']}><ArrowRight size={20} /></span>
                        </button>
                        <button
                            className={homeStyles['secondary-button']}
                            onClick={() => handleNavigate('gallery')}
                        >
                            <span>View Gallery</span>
                            <span className={homeStyles['button-icon']}><Camera size={20} /></span>
                        </button>
                    </div>

                    {/* Floating Stats */}
                    <div className={homeStyles['floating-stats']}>
                        <div className={homeStyles['stat-item']}>
                            <span className={homeStyles['stat-value']}>{stats.trails || '—'}</span>
                            <span className={homeStyles['stat-text']}>Trails</span>
                        </div>
                        <div className={homeStyles['stat-divider']}></div>
                        <div className={homeStyles['stat-item']}>
                            <span className={homeStyles['stat-value']}>{stats.trekkers || '—'}</span>
                            <span className={homeStyles['stat-text']}>Trekkers</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section with Cards */}
            <section className={homeStyles['features-section']}>
                <div className={homeStyles['section-header']}>
                    <span className={homeStyles['section-badge']}>Why Choose Us</span>
                    <h2 className={homeStyles['section-title']}>Your Ultimate Trekking Companion</h2>
                    <p className={homeStyles['section-subtitle']}>
                        Everything you need to plan, discover, and conquer India's most breathtaking trails
                    </p>
                </div>

                <div className={homeStyles['features-grid']}>
                    <div className={homeStyles['feature-card']}>
                        <div className={homeStyles['feature-icon-wrapper']}>
                            <span className={homeStyles['feature-icon']}><Target size={32} /></span>
                        </div>
                        <h3 className={homeStyles['feature-title']}>Accurate Data</h3>
                        <p className={homeStyles['feature-description']}>
                            Powered by OpenStreetMap with community verification to ensure reliability across all trails
                        </p>
                        <div className={homeStyles['feature-badge']}>Verified</div>
                    </div>

                    <div className={homeStyles['feature-card']}>
                        <div className={homeStyles['feature-icon-wrapper']}>
                            <span className={homeStyles['feature-icon']}><Zap size={32} /></span>
                        </div>
                        <h3 className={homeStyles['feature-title']}>Smart Search</h3>
                        <p className={homeStyles['feature-description']}>
                            Intelligent filtering with typo tolerance makes finding your perfect trek effortless
                        </p>
                        <div className={homeStyles['feature-badge']}>AI-Powered</div>
                    </div>

                    <div className={homeStyles['feature-card']}>
                        <div className={homeStyles['feature-icon-wrapper']}>
                            <span className={homeStyles['feature-icon']}><Shield size={32} /></span>
                        </div>
                        <h3 className={homeStyles['feature-title']}>Safety First</h3>
                        <p className={homeStyles['feature-description']}>
                            Detailed difficulty ratings, weather alerts, and real-time community insights
                        </p>
                        <div className={homeStyles['feature-badge']}>24/7 Updates</div>
                    </div>

                    <div className={homeStyles['feature-card']}>
                        <div className={homeStyles['feature-icon-wrapper']}>
                            <span className={homeStyles['feature-icon']}><Users size={32} /></span>
                        </div>
                        <h3 className={homeStyles['feature-title']}>Community Driven</h3>
                        <p className={homeStyles['feature-description']}>
                            Connect with experienced trekkers and share your adventures with fellow explorers
                        </p>
                        <div className={homeStyles['feature-badge']}>Active Community</div>
                    </div>
                </div>
            </section>

            {/* Popular Destinations */}
            <section className={homeStyles['destinations-section']}>
                <div className={homeStyles['section-header']}>
                    <span className={homeStyles['section-badge']}>Top Picks</span>
                    <h2 className={homeStyles['section-title']}>Popular Destinations</h2>
                    <p className={homeStyles['section-subtitle']}>
                        Handpicked trails loved by thousands of adventurers
                    </p>
                </div>

                <div className={homeStyles['destinations-grid']}>
                    {topTreks.length === 0 ? (
                        <div className={homeStyles['destination-card']} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                            <div className={homeStyles['destination-image']}><Mountain size={64} /></div>
                            <div className={homeStyles['destination-content']}>
                                <h3 className={homeStyles['destination-name']}>No treks available</h3>
                                <p className={homeStyles['destination-location']}>Try again later</p>
                            </div>
                        </div>
                    ) : (
                        topTreks.map((trek: Trek, i: number) => {
                            const name = trek.name || trek.title || `Trek #${trek.id || i}`;
                            const rating = trek.rating || trek.avg_rating || 0;
                            const location = trek.region || trek.state || trek.location || 'Unknown';
                            const distance = trek.distance || trek.length || trek.km || '--';
                            const difficulty = trek.difficulty || trek.level || 'Moderate';
                            const duration = trek.duration || trek.days || trek.estimated_time || '-';
                            return (
                                <div key={trek.id || i} className={homeStyles['destination-card']} onClick={() => handleNavigate('finder')} style={{ cursor: 'pointer' }}>
                                    <div className={homeStyles['destination-image']}><Mountain size={64} /></div>
                                    <div className={homeStyles['destination-content']}>
                                        <div className={homeStyles['destination-header']}>
                                            <h3 className={homeStyles['destination-name']}>{name}</h3>
                                        </div>
                                        <p className={homeStyles['destination-location']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {location}</p>
                                        <div className={homeStyles['destination-meta']}>
                                            <span className={homeStyles['meta-item']}>
                                                <span className={homeStyles['meta-icon']}><Ruler size={14} /></span>
                                                {distance}
                                            </span>
                                            <span className={homeStyles['meta-item']}>
                                                <span className={homeStyles['meta-icon']}><Circle size={14} fill="#ff4444" color="#ff4444" /></span>
                                                {difficulty}
                                            </span>
                                            <span className={homeStyles['meta-item']}>
                                                <span className={homeStyles['meta-icon']}><Clock size={14} /></span>
                                                {duration}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className={homeStyles['view-all-wrapper']}>
                    <button
                        className={homeStyles['view-all-button']}
                        onClick={() => handleNavigate('finder')}
                    >
                        View All Treks
                        <span className={homeStyles['button-arrow']}><ArrowRight size={20} /></span>
                    </button>
                </div>
            </section>

            {/* CTA Section */}
            <section className={homeStyles['cta-section']}>
                <div className={homeStyles['cta-content']}>
                    <h2 className={homeStyles['cta-title']}>Ready for Your Next Adventure?</h2>
                    <p className={homeStyles['cta-description']}>
                        Join thousands of trekkers discovering India's most beautiful trails
                    </p>
                    <button
                        className={homeStyles['cta-button']}
                        onClick={() => handleNavigate('finder')}
                    >
                        <span>Explore Trails Now</span>
                        <span className={homeStyles['cta-icon']}><Rocket size={24} /></span>
                    </button>
                </div>
            </section>

            {/* Footer / Credits Section */}
            <footer className={homeStyles['footer']}>
                <div className={homeStyles['footer-content']}>
                    <div className={homeStyles['footer-brand']}>
                        <h3 className={homeStyles['footer-logo']}>Trek Finder</h3>
                        <p className={homeStyles['footer-tagline']}>Your gateway to India's wilderness</p>
                    </div>

                    <div className={homeStyles['footer-credits']}>
                        <p className={homeStyles['credits-label']}>Designed, Developed & Ideated by</p>
                        <p className={homeStyles['credits-name']}>Nirmal Arsade</p>
                    </div>

                    <div className={homeStyles['footer-contact']}>
                        <h4 className={homeStyles['contact-heading']}>Get in Touch</h4>
                        <div className={homeStyles['contact-links']}>
                            <a href="mailto:contact@trekfinder.com" className={homeStyles['contact-link']}>
                                <span className={homeStyles['link-icon']}><Mail size={16} /></span>
                                Email
                            </a>
                            <a href="https://github.com/nirmalarsade" target="_blank" rel="noopener noreferrer" className={homeStyles['contact-link']}>
                                <span className={homeStyles['link-icon']}><Github size={16} /></span>
                                GitHub
                            </a>
                            <a href="https://linkedin.com/in/nirmalarsade" target="_blank" rel="noopener noreferrer" className={homeStyles['contact-link']}>
                                <span className={homeStyles['link-icon']}><Linkedin size={16} /></span>
                                LinkedIn
                            </a>
                        </div>
                    </div>

                    <div className={homeStyles['footer-bottom']}>
                        <p className={homeStyles['copyright']}>© 2026 Trek Finder. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

