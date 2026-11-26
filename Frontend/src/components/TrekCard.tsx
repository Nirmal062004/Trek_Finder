'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Clock, MapPin, Ruler, Navigation } from 'lucide-react';
import styles from '@/styles/TrekFinder.module.css';
import type { TrekSummary } from '@/context/WishlistContext';

interface TrekCardProps {
    trek: TrekSummary;
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
    const location = trek.tags?.region || trek.tags?.location || trek.tags?.is_in || 'Uttarakhand, India';

    return (
        <article id={`trek-card-${trek.id}`} className={`${styles['finder-card']} ${isSaved ? styles['finder-card-saved'] : ''}`}>
            <div className={styles['finder-card-image']}>
                <Image src="/assets/img/image.jpg" alt="Forest trail landscape" fill sizes="104px" />
            </div>
            <div className={styles['finder-card-content']}>
                <div className={styles['finder-card-heading']}>
                    <h3>{name}</h3>
                    <button
                        onClick={onSave}
                        className={styles['finder-card-save']}
                        title={isSaved ? "Remove from saved" : "Save trek"}
                        aria-label={isSaved ? `Remove ${name} from saved trails` : `Save ${name}`}
                    >
                        <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                </div>
                <div className={styles['finder-card-location']}><MapPin size={14} /> <span>{location}</span></div>
                <div className={styles['finder-card-meta']}>
                    <span><Ruler size={13} /> {length > 0 ? `${(length / 1000).toFixed(0)} km` : `${(distance / 1000).toFixed(1)} km`}</span>
                    <span><Clock size={13} /> {duration >= 24 ? `${Math.round(duration / 24)} days` : `${duration} h`}</span>
                    <span className={`${styles['finder-card-difficulty']} ${styles[`difficulty-${difficulty.toLowerCase()}`]}`}>{difficulty}</span>
                    <span className={styles['finder-card-safety']} title={`Safety rating ${safety} of 5`}>{safety}/5</span>
                </div>
                <button className={styles['finder-card-route']} onClick={onViewRoute}>
                    <Navigation size={13} /> View route
                </button>
            </div>
        </article>
    );
}
