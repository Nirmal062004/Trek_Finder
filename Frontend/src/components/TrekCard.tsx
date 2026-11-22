'use client';

import React from 'react';
import { Heart, Clock, Star, MapPin, Ruler } from 'lucide-react';
import styles from '@/styles/TrekFinder.module.css';

interface TrekCardProps {
    trek: any;
    name: string;
    isSaved: boolean;
    onSave: (e: React.MouseEvent) => void;
    onViewRoute: () => void;
}

export default function TrekCard({ trek, name, isSaved, onSave, onViewRoute }: TrekCardProps) {
    const difficulty = trek.difficulty || 'Moderate';
    const duration = trek.duration || 2;
    const distance = trek.distance || 0;
    const length = trek.length || 0;
    const safety = trek.safety || 3;

    return (
        <div id={`trek-card-${trek.id}`} className={`${styles['result-item']} ${isSaved ? styles['saved-item'] : ''}`}>
            <div className={styles['result-header']}>
                <div className={styles['result-title']}>{name}</div>
                <button
                    onClick={onSave}
                    className={styles['save-btn']}
                    title={isSaved ? "Remove from saved" : "Save trek"}
                >
                    <Heart size={18} fill={isSaved ? "#ff4444" : "none"} color={isSaved ? "#ff4444" : "#888"} />
                </button>
            </div>
            <div className={styles['result-badges']}>
                <span className={`${styles['badge']} ${styles[`difficulty-${difficulty.toLowerCase()}`]}`}>{difficulty}</span>
                <span className={styles['badge']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {duration}h</span>
                <span className={styles['badge']} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {Array(safety).fill(0).map((_, i) => (<Star key={i} size={12} fill="#FFD700" color="#FFD700" />))}
                </span>
            </div>
            <div className={styles['result-meta']}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {(distance / 1000).toFixed(1)} km away</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Ruler size={14} /> {(length / 1000).toFixed(1)} km trek</span>
            </div>
            <button className={styles['view-route-btn']} onClick={onViewRoute}>View Route</button>
        </div>
    );
}
