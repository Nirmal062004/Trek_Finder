'use client';

import { useState, useEffect, useCallback } from 'react';

export function useAvatar(user: { id?: string; name?: string; email?: string } | null) {
    const [avatarSeed, setAvatarSeed] = useState<string>('');
    const [avatarOptions, setAvatarOptions] = useState<string[]>([]);

    const storageOwner = useCallback(() => {
        return (user as any)?.id || user?.email || user?.name || 'anon';
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const uid = storageOwner();
        const storageKey = `trek_finder_avatar_seed_${uid}`;
        const seed = localStorage.getItem(storageKey) || user.name || 'Anonymous';
        setAvatarSeed(seed);

        const updateAvatar = () => {
            const s = localStorage.getItem(storageKey) || user.name || 'Anonymous';
            setAvatarSeed(s);
        };

        window.addEventListener('storage', updateAvatar);
        window.addEventListener('avatar-updated', updateAvatar as EventListener);

        return () => {
            window.removeEventListener('storage', updateAvatar);
            window.removeEventListener('avatar-updated', updateAvatar as EventListener);
        };
    }, [user, storageOwner]);

    const generateOptions = useCallback((currentSeed: string) => {
        const options = [currentSeed];
        for (let i = 0; i < 9; i++) {
            options.push(Math.random().toString(36).substring(7));
        }
        setAvatarOptions(options);
    }, []);

    const saveAvatar = useCallback((newSeed: string) => {
        const uid = storageOwner();
        const storageKey = `trek_finder_avatar_seed_${uid}`;
        localStorage.setItem(storageKey, newSeed);
        setAvatarSeed(newSeed);
        window.dispatchEvent(new Event('avatar-updated'));
    }, [storageOwner]);

    return { avatarSeed, setAvatarSeed, avatarOptions, generateOptions, saveAvatar };
}
