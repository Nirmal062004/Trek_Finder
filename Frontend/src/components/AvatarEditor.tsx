'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';

interface AvatarEditorProps {
    isOpen: boolean;
    currentSeed: string;
    onClose: () => void;
    onSave: (seed: string) => void;
}

export default function AvatarEditor({ isOpen, currentSeed, onClose, onSave }: AvatarEditorProps) {
    const [tempSeed, setTempSeed] = useState(currentSeed);
    const [options, setOptions] = useState<string[]>([currentSeed]);

    useEffect(() => {
        if (!isOpen) return;
        setTempSeed(currentSeed);
        const extra: string[] = [];
        for (let i = 0; i < 9; i++) extra.push(Math.random().toString(36).substring(7));
        setOptions([currentSeed, ...extra]);
    }, [currentSeed, isOpen]);

    const generateOptions = useCallback(() => {
        const extra: string[] = [];
        for (let i = 0; i < 9; i++) extra.push(Math.random().toString(36).substring(7));
        setOptions([tempSeed, ...extra]);
    }, [tempSeed]);

    const handleSave = () => {
        onSave(tempSeed);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ width: 450, background: '#1a2c20', border: '1px solid #2bff88', borderRadius: 24, padding: 32, boxShadow: '0 0 40px rgba(43,255,136,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ color: '#fff', margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 600 }}>Choose Your Avatar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, width: '100%' }}>
                    {options.map((seed, idx) => (
                        <div
                            key={idx}
                            onClick={() => setTempSeed(seed)}
                            style={{
                                width: '100%', aspectRatio: '1', borderRadius: '50%', background: '#fff', overflow: 'hidden', cursor: 'pointer',
                                border: tempSeed === seed ? '3px solid #2bff88' : '2px solid rgba(255,255,255,0.1)',
                                transform: tempSeed === seed ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={`Option ${idx}`} style={{ width: '100%', height: '100%' }} />
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    <button
                        onClick={generateOptions}
                        style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        <RefreshCw size={18} /> New Options
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ flex: 1, padding: '12px', background: '#2bff88', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        <Save size={18} /> Save Selection
                    </button>
                </div>
                <button onClick={onClose} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
