'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from 'framer-motion';
import homeStyles from '@/styles/Home.module.css';
import { Mountain, ArrowRight, Camera, Target, Zap, Shield, Users, MapPin, Ruler, Circle, Clock, Rocket, Mail, Github, Linkedin, Star, Flame, Trophy, Compass, ArrowUpRight } from 'lucide-react';
import { backendAPI } from '@/shared/services/api';
import LiveBackground from '@/components/LiveBackground';
import { Button } from '@/components/ui/Button';

type Trek = any;

export default function HomePage() {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parallax scroll effects
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
    const opacityBg = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    const handleNavigate = (path: string) => {
        router.push(`/${path}`);
    };

    const [stats, setStats] = useState({ trails: 0, trekkers: 0 });
    const [topTreks, setTopTreks] = useState<Trek[]>([]);

    // Smart stat display — never show embarrassingly small numbers
    const formatStat = (n: number, floor: number) =>
        n < floor ? `${floor}+` : n > 999 ? `${(n / 1000).toFixed(1)}k+` : `${n}+`;

    // Fallback trek data — shown when backend is offline
    const FALLBACK_TREKS: Trek[] = [
        { id: 'f1', name: 'Roopkund Trek', region: 'Uttarakhand', distance: '53 km', difficulty: 'Hard', duration: '8 Days', season: 'May–Jun' },
        { id: 'f2', name: 'Valley of Flowers', region: 'Chamoli, UK', distance: '38 km', difficulty: 'Moderate', duration: '6 Days', season: 'Jul–Sep' },
        { id: 'f3', name: 'Hampta Pass', region: 'Himachal Pradesh', distance: '35 km', difficulty: 'Moderate', duration: '5 Days', season: 'Jun–Oct' },
        { id: 'f4', name: 'Kedarkantha Peak', region: 'Uttarkashi, UK', distance: '20 km', difficulty: 'Easy', duration: '4 Days', season: 'Dec–Apr' },
    ];

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

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
    };

    return (
        <div className={homeStyles['home-container']} ref={containerRef}>
            {/* ── Live animated canvas background ── */}
            <LiveBackground />
            {/* Ambient Background layer */}
            <motion.div className={homeStyles['bg-ambient']} style={{ opacity: opacityBg }} />

            {/* Hero Section */}
            <div className={homeStyles['home-hero']}>
                <motion.div 
                    className={homeStyles['hero-image-layer']}
                    style={{ y: heroY }}
                />
                
                <div className={homeStyles['hero-content']}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={homeStyles['hero-badge']}
                    >
                        <Compass className={homeStyles['pulse-icon']} size={20} /> 
                        <span>Explore the Uncharted</span>
                    </motion.div>
                    
                    <motion.h1 
                        className={homeStyles['hero-title']}
                        style={{ y: textY }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    >
                        Conquer Your Next
                        <span className={homeStyles['hero-highlight']}> Adventure</span>
                    </motion.h1>
                    
                    <motion.p 
                        className={homeStyles['hero-description']}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.6 }}
                    >
                        Join {stats.trekkers > 0 ? formatStat(stats.trekkers, 500) : '10k+'} bold explorers tracking {stats.trails > 0 ? formatStat(stats.trails, 200) : '500+'} majestic trails. Your legacy begins where the road ends.
                    </motion.p>
                    
                    <motion.div 
                        className={homeStyles['hero-buttons']}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                    >
                        <Button variant="primary" size="lg" fullWidth={false} onClick={() => handleNavigate('finder')}>
                            <span>Find Your Trail</span>
                            <ArrowRight size={20} />
                        </Button>
                        <Button variant="secondary" size="lg" fullWidth={false} onClick={() => handleNavigate('gallery')}>
                            <Camera size={20} />
                            <span>View Gallery</span>
                        </Button>
                    </motion.div>

                    {/* Social Proof / Gamification */}
                    <motion.div 
                        className={homeStyles['social-proof']}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                    >
                        <div className={homeStyles['avatars']}>
                            {[1,2,3,4].map(i => (
                                <div key={i} className={homeStyles['avatar']} style={{ backgroundImage: `url(https://i.pravatar.cc/100?img=${i + 10})`}}></div>
                            ))}
                        </div>
                        <div className={homeStyles['proof-text']}>
                            <div className={homeStyles['stars']}>
                                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#2bff88" color="#2bff88" />)}
                            </div>
                            <span>Loved by active adventurers</span>
                        </div>
                    </motion.div>
                </div>
                
                {/* Scroll Indicator */}
                <motion.div 
                    className={homeStyles['scroll-indicator']}
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <div className={homeStyles['mouse']}>
                        <div className={homeStyles['wheel']}></div>
                    </div>
                </motion.div>
            </div>

            {/* Features Section */}
            <section className={homeStyles['features-section']}>
                <div className={homeStyles['section-glow']}></div>
                <motion.div 
                    className={homeStyles['section-header']}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    <motion.span variants={itemVariants} className={homeStyles['section-badge']}><Flame size={16}/> Essential Tools</motion.span>
                    <motion.h2 variants={itemVariants} className={homeStyles['section-title']}>Elevate Your Trekking</motion.h2>
                    <motion.p variants={itemVariants} className={homeStyles['section-subtitle']}>
                        State-of-the-art navigation, real-time weather, and community insights.
                    </motion.p>
                </motion.div>

                <motion.div 
                    className={homeStyles['features-grid']}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    {[
                        { icon: <Target size={32} />, title: "Precision Tracking", desc: "Topographic maps with millimeter accuracy for true wilderness navigation.", badge: "Pro Grade" },
                        { icon: <Shield size={32} />, title: "Survival First", desc: "Real-time hazard alerts and offline SOS routing to keep you safe in the unknown.", badge: "Critical" },
                        { icon: <Zap size={32} />, title: "AI Discoveries", desc: "Our algorithm finds hidden gems tailored precisely to your fitness and skill level.", badge: "Smart" },
                        { icon: <Users size={32} />, title: "Elite Community", desc: "Track with veterans. Share route adjustments, camp spots, and gear reviews.", badge: "Network" }
                    ].map((feat, idx) => (
                        <motion.div key={idx} variants={itemVariants} className={homeStyles['feature-card']}>
                            <div className={homeStyles['feature-icon-wrapper']}>
                                {feat.icon}
                            </div>
                            <h3 className={homeStyles['feature-title']}>{feat.title}</h3>
                            <p className={homeStyles['feature-description']}>{feat.desc}</p>
                            <div className={homeStyles['feature-badge']}>{feat.badge}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Popular Destinations */}
            <section className={homeStyles['destinations-section']}>
                <motion.div 
                    className={homeStyles['section-header']}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    <motion.span variants={itemVariants} className={homeStyles['section-badge']}><Trophy size={16}/> Legendary Trails</motion.span>
                    <motion.h2 variants={itemVariants} className={homeStyles['section-title']}>Paths of Glory</motion.h2>
                    <motion.p variants={itemVariants} className={homeStyles['section-subtitle']}>
                        Only the most breathtaking, highly-rated routes make it here.
                    </motion.p>
                </motion.div>

                <motion.div 
                    className={homeStyles['destinations-grid']}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    {(topTreks.length > 0 ? topTreks : FALLBACK_TREKS).map((trek: Trek, i: number) => {
                            const name = trek.name || trek.title || `Trek #${trek.id || i}`;
                            const location = trek.region || trek.state || trek.location || 'Unknown Wilderness';
                            const distance = trek.distance || trek.length || trek.km || '12 km';
                            const difficulty = trek.difficulty || trek.level || 'Hard';
                            const duration = trek.duration || trek.days || trek.estimated_time || '2 Days';
                            
                            // Difficult color logic
                            const diffColor = difficulty.toLowerCase().includes('hard') ? '#ff4444' : 
                                              difficulty.toLowerCase().includes('easy') ? '#4caf50' : '#ffaa00';

                            return (
                                <motion.div 
                                    key={trek.id || i} 
                                    variants={itemVariants} 
                                    whileHover={{ y: -10, scale: 1.02 }}
                                    className={homeStyles['destination-card']} 
                                    onClick={() => handleNavigate('finder')}
                                >
                                    <div className={homeStyles['card-overlay']}></div>
                                    <div className={homeStyles['destination-image-box']}>
                                        <Mountain size={48} className={homeStyles['mountain-icon']} />
                                    </div>
                                    <div className={homeStyles['destination-content']}>
                                        <h3 className={homeStyles['destination-name']}>{name}</h3>
                                        <p className={homeStyles['destination-location']}>
                                            <MapPin size={14} /> {location}
                                        </p>
                                        <div className={homeStyles['destination-stats']}>
                                            <span><Ruler size={14} /> {distance}</span>
                                            <span><Circle size={12} fill={diffColor} color={diffColor} /> {difficulty}</span>
                                            <span><Clock size={14} /> {duration}</span>
                                        </div>
                                    </div>
                                    <div className={homeStyles['explore-overlay']}>
                                        <span>View Route</span> <ArrowUpRight size={18} />
                                    </div>
                                </motion.div>
                            );
                        })
                    }
                </motion.div>

                <motion.div 
                    className={homeStyles['view-all-wrapper']}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <Button variant="primary" size="lg" fullWidth={false} onClick={() => handleNavigate('finder')}>
                        Browse All {stats.trails > 0 ? stats.trails : ''} Trails
                        <ArrowRight size={20} />
                    </Button>
                </motion.div>
            </section>

            {/* Immersion Parallax CTA Section */}
            <section className={homeStyles['cta-parallax-section']}>
                <div className={homeStyles['cta-parallax-bg']}></div>
                <motion.div 
                    className={homeStyles['cta-content']}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={containerVariants}
                >
                    <motion.h2 variants={itemVariants} className={homeStyles['cta-title']}>The Mountain is Calling.</motion.h2>
                    <motion.p variants={itemVariants} className={homeStyles['cta-description']}>
                        Don't let another weekend slip away. Equip yourself with the ultimate trekking intelligence and carve your name into the wild.
                    </motion.p>
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth={false}
                        onClick={() => handleNavigate('finder')}
                    >
                        <Rocket size={20} /> <span>Start Your Journey</span>
                    </Button>
                </motion.div>
            </section>

            {/* Minimalist Premium Footer */}
            <footer className={homeStyles['premium-footer']}>
                <div className={homeStyles['footer-top-glow']}></div>
                <div className={homeStyles['footer-content']}>
                    <div className={homeStyles['footer-brand']}>
                        <Mountain size={36} color="#2bff88" />
                        <h3 className={homeStyles['footer-logo']}>Trek Finder</h3>
                        <p className={homeStyles['footer-tagline']}>Mapping the uncharted, one step at a time.</p>
                    </div>

                    <div className={homeStyles['footer-links-grid']}>
                        <div className={homeStyles['footer-col']}>
                            <h4>Explore</h4>
                            <a href="/finder">Trails Directory</a>
                            <a href="/gallery">Community Gallery</a>
                            <a href="#">Safety Guides</a>
                        </div>
                        <div className={homeStyles['footer-col']}>
                            <h4>Connect</h4>
                            <a href="mailto:contact@trekfinder.com"><Mail size={16}/> Email Us</a>
                            <a href="https://github.com/nirmalarsade" target="_blank" rel="noreferrer"><Github size={16}/> GitHub</a>
                            <a href="https://linkedin.com/in/nirmalarsade" target="_blank" rel="noreferrer"><Linkedin size={16}/> LinkedIn</a>
                        </div>
                    </div>
                </div>
                <div className={homeStyles['footer-bottom']}>
                    <p>© {new Date().getFullYear()} Trek Finder. Crafted for the wild. Developed by Nirmal Arsade.</p>
                </div>
            </footer>
        </div>
    );
}
