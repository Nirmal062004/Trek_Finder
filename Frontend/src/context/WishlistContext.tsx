"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backendAPI } from '@/shared/services/api';

export interface TrekSummary {
  id: number | string;
  tags?: Record<string, any>;
  coords?: [number, number][];
  distance?: number;
  difficulty?: string;
  duration?: number;
  length?: number;
  safety?: number;
  popularity?: number;
  isSaved?: boolean;
}

interface WishlistContextShape {
  savedTreks: TrekSummary[];
  savedIds: Set<number | string>;
  addTrek: (t: TrekSummary) => void;
  removeTrek: (id: number | string) => void;
  toggleTrek: (t: TrekSummary) => void;
  isSaved: (id: number | string) => boolean;
}

const STORAGE_KEY = 'trek_finder_saved_treks';

const WishlistContext = createContext<WishlistContextShape | null>(null);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [savedTreks, setSavedTreks] = useState<TrekSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load wishlist from Supabase when user is authenticated, otherwise localStorage
  useEffect(() => {
    const loadWishlist = async () => {
      try {
        if (user?.id) {
          // Authenticated: sync from Supabase bookmarks
          const trekIds = await backendAPI.getBookmarks(user.id);
          // Fetch full trek details for saved treks from localStorage as fallback data
          const raw = localStorage.getItem(STORAGE_KEY);
          const localTreks: TrekSummary[] = raw ? JSON.parse(raw) : [];
          const savedSet = new Set(trekIds);
          const merged = localTreks.filter((t) => savedSet.has(t.id));
          setSavedTreks(merged);
        } else {
          // Guest: load from localStorage only
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setSavedTreks(JSON.parse(raw));
        }
      } catch (e) {
        console.error('Failed to load wishlist', e);
        // Fall back to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setSavedTreks(JSON.parse(raw));
        } catch (_) {}
      } finally {
        setIsLoaded(true);
      }
    };
    loadWishlist();
  }, [user]);

  // Persist to localStorage always, and to Supabase when authenticated
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTreks));
    } catch (e) {
      console.error('Failed to persist wishlist to localStorage', e);
    }
  }, [savedTreks, isLoaded]);

  const savedIds = new Set(savedTreks.map((t) => t.id));

  const addTrek = useCallback(async (t: TrekSummary) => {
    setSavedTreks((prev) => {
      if (prev.find((p) => p.id === t.id)) return prev;
      return [...prev, { ...t, isSaved: true }];
    });

    // Sync to Supabase if authenticated
    if (user?.id) {
      try {
        await backendAPI.addBookmark({ trek_id: String(t.id) });
      } catch (e) {
        console.warn('Failed to sync bookmark to Supabase:', e);
      }
    }
  }, [user]);

  const removeTrek = useCallback(async (id: number | string) => {
    setSavedTreks((prev) => prev.filter((p) => p.id !== id));

    // Sync to Supabase if authenticated
    if (user?.id) {
      try {
        await backendAPI.removeBookmark(String(id), user.id);
      } catch (e) {
        console.warn('Failed to remove bookmark from Supabase:', e);
      }
    }
  }, [user]);

  const toggleTrek = useCallback((t: TrekSummary) => {
    if (savedIds.has(t.id)) {
      removeTrek(t.id);
    } else {
      addTrek(t);
    }
  }, [savedIds, addTrek, removeTrek]);

  const isSaved = (id: number | string) => savedIds.has(id);

  return (
    <WishlistContext.Provider value={{ savedTreks, savedIds, addTrek, removeTrek, toggleTrek, isSaved }}>
      {children}
    </WishlistContext.Provider>
  );
};

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

export default WishlistContext;
