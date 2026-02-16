"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

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
  const [savedTreks, setSavedTreks] = useState<TrekSummary[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedTreks(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load wishlist', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTreks));
    } catch (e) {
      console.error('Failed to persist wishlist', e);
    }
  }, [savedTreks]);

  const savedIds = new Set(savedTreks.map((t) => t.id));

  const addTrek = (t: TrekSummary) => {
    setSavedTreks((prev) => {
      if (prev.find((p) => p.id === t.id)) return prev;
      return [...prev, { ...t, isSaved: true }];
    });
  };

  const removeTrek = (id: number | string) => {
    setSavedTreks((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleTrek = (t: TrekSummary) => {
    if (savedIds.has(t.id)) removeTrek(t.id);
    else addTrek(t);
  };

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
