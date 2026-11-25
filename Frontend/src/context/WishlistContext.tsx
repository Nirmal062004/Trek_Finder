"use client";

import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

export interface TrekSummary {
  id: number | string;
  tags?: Record<string, string>;
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
const EMPTY_TREKS: TrekSummary[] = [];
const CHANGE_EVENT = 'wishlist-updated';

let cachedRaw: string | null | undefined;
let cachedTreks: TrekSummary[] = EMPTY_TREKS;

function isTrekSummary(value: unknown): value is TrekSummary {
  return typeof value === 'object' && value !== null && 'id' in value &&
    (typeof value.id === 'number' || typeof value.id === 'string');
}

function getSavedTreksSnapshot(): TrekSummary[] {
  if (typeof window === 'undefined') return EMPTY_TREKS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedTreks;

  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : EMPTY_TREKS;
    cachedTreks = Array.isArray(parsed) ? parsed.filter(isTrekSummary) : EMPTY_TREKS;
  } catch (error) {
    console.error('Failed to load wishlist', error);
    cachedTreks = EMPTY_TREKS;
  }
  return cachedTreks;
}

function subscribeToWishlist(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function updateSavedTreks(update: (treks: TrekSummary[]) => TrekSummary[]): void {
  const updatedTreks = update(getSavedTreksSnapshot());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTreks));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const WishlistContext = createContext<WishlistContextShape | null>(null);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedTreks = useSyncExternalStore(subscribeToWishlist, getSavedTreksSnapshot, () => EMPTY_TREKS);

  const savedIds = useMemo(() => new Set(savedTreks.map((trek) => trek.id)), [savedTreks]);

  const addTrek = (t: TrekSummary) => {
    updateSavedTreks((previous) => {
      if (previous.some((savedTrek) => savedTrek.id === t.id)) return previous;
      return [...previous, { ...t, isSaved: true }];
    });
  };

  const removeTrek = (id: number | string) => {
    updateSavedTreks((previous) => previous.filter((savedTrek) => savedTrek.id !== id));
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
