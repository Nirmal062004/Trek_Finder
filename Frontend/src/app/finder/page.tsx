'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from '@/styles/TrekFinder.module.css';
import { Search, MapPin, Heart, Clock, Star, Ruler, RotateCcw, Loader } from 'lucide-react';
import { fetchWithStaleWhileRevalidate, makeCacheKey } from '@/shared/utils/fetchCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/context/WishlistContext';

const MapFeature = dynamic(() => import('@/components/MapFeature'), {
    ssr: false,
    loading: () => <div className={styles['trek-map']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2bff88' }}>Loading Map...</div>
});

// (All helper functions and types from the original TrekFinder component are preserved here)
interface Way {
    id: number;
    tags: Record<string, string>;
    coords: [number, number][];
    center?: { lat: number; lon: number };
}

interface Trek {
    id: number | string;
    tags: Record<string, string>;
    coords: [number, number][];
    distance: number;
    difficulty: 'Easy' | 'Moderate' | 'Hard';
    duration: number;
    length: number;
    safety: number;
    popularity?: number;
    isSaved?: boolean;
}

interface Location {
    lat: number;
    lng: number;
    name: string;
}

interface Filters {
    difficulty: string;
    duration: string;
    sortBy: string;
    showSavedOnly?: boolean;
}

const STORAGE_KEY_SAVED_TREKS = 'trek_finder_saved_treks';

async function runOverpass(query: string, externalSignal?: AbortSignal): Promise<any> {
    const key = makeCacheKey('overpass', query);
    return fetchWithStaleWhileRevalidate(
        key,
        async () => {
            const endpoints = [
                'https://overpass-api.de/api/interpreter',
                'https://overpass.kumi.systems/api/interpreter',
                'https://overpass.openstreetmap.fr/api/interpreter',
            ];

            let lastError: any = null;
            const maxAttempts = 3;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                for (const url of endpoints) {
                    try {
                        const controller = new AbortController();
                        const timeoutMs = 15000 * attempt;
                        const timer = setTimeout(() => controller.abort(), timeoutMs);
                        let externalListener: (() => void) | null = null;
                        if (externalSignal) {
                            if (externalSignal.aborted) {
                                controller.abort();
                            } else {
                                externalListener = () => controller.abort();
                                externalSignal.addEventListener('abort', externalListener);
                            }
                        }

                        const resp = await fetch(url, {
                            method: 'POST',
                            body: query,
                            headers: { 'Content-Type': 'text/plain' },
                            signal: controller.signal,
                        });

                        clearTimeout(timer);
                        if (externalSignal && externalListener) externalSignal.removeEventListener('abort', externalListener);

                        if (!resp.ok) {
                            lastError = new Error(`Overpass error: ${resp.status}`);
                            // try next endpoint on 5xx (including 504), otherwise surface error
                            if (resp.status >= 500 && resp.status < 600) continue;
                            throw lastError;
                        }

                        return resp.json();
                    } catch (err) {
                        lastError = err;
                        // network/timeout errors: try next endpoint
                    }
                }

                // exponential backoff between attempts
                await new Promise((r) => setTimeout(r, 500 * attempt));
            }

            throw lastError || new Error('Overpass fetch failed');
        },
        1000 * 60 * 5
    );
}

function buildWaysFromOverpass(data: any): Way[] {
    const ways: Way[] = [];

    // Overpass can return geometries directly via `out geom` - prefer that.
    (data.elements || []).forEach((el: any) => {
        try {
            if (el.type === 'way' || el.type === 'relation') {
                let coords: [number, number][] = [];

                if (el.geometry && Array.isArray(el.geometry) && el.geometry.length) {
                    coords = el.geometry.map((g: any) => [g.lat, g.lon]);
                } else if (el.nodes && el.nodes.length && data.elements) {
                    // fallback: map node refs to node entries (rare when using out geom)
                    const nodeMap = new Map<number, [number, number]>();
                    (data.elements || []).forEach((n: any) => {
                        if (n.type === 'node') nodeMap.set(n.id, [n.lat, n.lon]);
                    });
                    coords = (el.nodes || []).map((nid: number) => nodeMap.get(nid)).filter(Boolean) as [number, number][];
                }

                // skip empty geometries
                if (coords.length) {
                    // simplify by sampling points when very large
                    const MAX_POINTS = 800;
                    if (coords.length > MAX_POINTS) {
                        const step = Math.ceil(coords.length / MAX_POINTS);
                        coords = coords.filter((_, i) => i % step === 0);
                    }

                    ways.push({ id: el.id, tags: el.tags || {}, coords, center: el.center });
                }
            }
        } catch (err) {
            // tolerate parsing errors for individual elements
        }
    });

    return ways;
}

function haversineDistance(
    [lat1, lon1]: [number, number],
    [lat2, lon2]: [number, number]
): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function estimatePathLength(coords: [number, number][]): number {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
        total += haversineDistance(coords[i - 1], coords[i]);
    }
    return total;
}

function generateTrekName(
    tags: Record<string, string>,
    difficulty: string,
    pathLength: number
): string {
    if (tags.name) return tags.name;
    if (tags['name:en']) return tags['name:en'];

    if (tags.description) return tags.description.split('\n')[0];
    if (tags.ref) return `Trail ${tags.ref}`;

    const terrainTypes: Record<string, string> = {
        hiking: 'Hiking',
        ridge: 'Ridge Trek',
        mountain: 'Mountain Trek',
        forest: 'Forest Trek',
        loop: 'Loop Trail',
        circuit: 'Circuit Trek',
        nature: 'Nature Trail',
        scenic: 'Scenic Trek',
        peak: 'Peak Trek',
    };

    const difficultyKeywords = {
        'hard': 'Hard', 'difficult': 'Hard', 'extreme': 'Hard', 'steep': 'Hard',
        'climb': 'Hard', 'summit': 'Hard', 'peak': 'Hard', 'alpine': 'Hard', 'glacier': 'Hard',
        'moderate': 'Moderate', 'medium': 'Moderate', 'intermediate': 'Moderate',
        'hike': 'Moderate', 'hiking': 'Moderate', 'trek': 'Moderate', 'ascent': 'Moderate',
        'easy': 'Easy', 'walk': 'Easy', 'path': 'Easy', 'trail': 'Easy', 'nature': 'Easy', 'garden': 'Easy'
    };

    for (const [key, name] of Object.entries(terrainTypes)) {
        if (
            tags.description?.toLowerCase().includes(key) ||
            tags.name_en?.toLowerCase().includes(key) ||
            tags.route_name?.toLowerCase().includes(key) ||
            tags.name?.toLowerCase().includes(key)
        ) {
            for (const [diffKey, diffVal] of Object.entries(difficultyKeywords)) {
                if (tags.name?.toLowerCase().includes(diffKey) || tags.description?.toLowerCase().includes(diffKey)) {
                    return `${name} - ${diffVal}`;
                }
            }
            return `${name} - ${difficulty}`;
        }
    }

    const lengthKm = Math.round(pathLength / 1000);
    return `${difficulty} Trek (${lengthKm}km)`;
}

function levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }

    return track[str2.length][str1.length];
}

const MAJOR_INDIAN_CITIES = [
    'Manali', 'Nashik', 'Rishikesh', 'Darjeeling', 'Ooty', 'Kasol', 'Nainital',
    'Shimla', 'Mussoorie', 'Goa', 'Kerala', 'Munnar', 'Coorg', 'Auli', 'Uttarkashi',
    'Chopta', 'Arunachal Pradesh', 'Meghalaya', 'Sikkim', 'Himachal Pradesh',
    'Uttarakhand', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Assam',
    'Mandi', 'Kinnaur', 'Spiti', 'Ladakh', 'Leh', 'Kargil', 'Jaipur', 'Udaipur',
    'Ranakpur', 'Pushkar', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune',
    'Dehradun', 'Haridwar', 'Guwahati', 'Kolkata', 'Mumbai', 'Indore', 'Agra',
];

function findClosestCity(input: string): string | null {
    const inputLower = input.toLowerCase();
    let closestCity: string | null = null;
    let closestDistance = Infinity;

    for (const city of MAJOR_INDIAN_CITIES) {
        const distance = levenshteinDistance(inputLower, city.toLowerCase());
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCity = city;
        }
    }

    const maxAllowedDistance = Math.ceil(
        Math.max(input.length, closestCity?.length || 0) * 0.4
    );
    return closestDistance <= maxAllowedDistance ? closestCity : null;
}

async function geocodeLocation(locationName: string): Promise<Location | null> {
    const baseQuery = `${locationName}, India`;
    const key = makeCacheKey('nominatim', baseQuery);

    return fetchWithStaleWhileRevalidate(key, async () => {
        try {
            let query = baseQuery;
            let response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                { headers: { 'User-Agent': 'TrekFinder-App (localhost:3000)' } }
            );

            if (!response.ok) return null;
            let data: any[] = await response.json();

            if (!data || data.length === 0) {
                const closestCity = findClosestCity(locationName);
                if (closestCity) {
                    query = `${closestCity}, India`;
                    response = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                        { headers: { 'User-Agent': 'TrekFinder-App (localhost:3000)' } }
                    );
                    if (!response.ok) return null;
                    data = await response.json();
                    if (!data || data.length === 0) return null;
                } else {
                    return null;
                }
            }

            const INDIA_BBOX = { south: 6.746778, west: 68.1097, north: 35.674545, east: 97.39556 };
            const indiaResult = data.find(
                (result) =>
                    parseFloat(result.lat) >= INDIA_BBOX.south &&
                    parseFloat(result.lat) <= INDIA_BBOX.north &&
                    parseFloat(result.lon) >= INDIA_BBOX.west &&
                    parseFloat(result.lon) <= INDIA_BBOX.east
            ) || data[0];

            return {
                lat: parseFloat(indiaResult.lat),
                lng: parseFloat(indiaResult.lon),
                name: indiaResult.display_name,
            };
        } catch (err) {
            console.error('Geocoding error:', err);
            return null;
        }
    }, 1000 * 60 * 60 * 24);
}

interface TrekFinderProps {
    onSelectTrek?: (trek: any) => void;
    onClose?: () => void;
}

const TrekFinder: React.FC<TrekFinderProps> = ({ onSelectTrek, onClose }) => {
    const router = useRouter();
    // Map State
    const [mapCenter, setMapCenter] = useState<[number, number]>([22.5937, 78.9629]);
    const [mapZoom, setMapZoom] = useState(5);
    const [mapPitch, setMapPitch] = useState(0);
    const [markers, setMarkers] = useState<Array<{ coords: [number, number]; title?: string }>>([]);
    const [polylines, setPolylines] = useState<Array<{ coords: [number, number][]; color: string; weight?: number; opacity?: number; dashArray?: string; popup?: string; lineCap?: 'butt' | 'round' | 'square' }>>([]);
    const [circleMarkers, setCircleMarkers] = useState<Array<{ coords: [number, number]; color: string; fillColor?: string; radius: number; popup?: string }>>([]);
    const [fitBounds, setFitBounds] = useState<[number, number][] | undefined>(undefined);
    const [userMarkerSet, setUserMarkerSet] = useState(false);

    // Logic State
    const [results, setResults] = useState<Trek[]>([]);
    const [allResults, setAllResults] = useState<Trek[]>([]);
    const { savedTreks, savedIds, toggleTrek, isSaved } = useWishlist();
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [radius, setRadius] = useState(60);
    const [trekNameFilter, setTrekNameFilter] = useState('');
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [filters, setFilters] = useState<Filters>({
        difficulty: 'all',
        duration: 'all',
        sortBy: 'distance',
        showSavedOnly: false,
    });
    // Pending controls: user edits these then clicks Apply to set `filters` and `radius`
    const [pendingFilters, setPendingFilters] = useState<Filters>(filters);
    const [pendingRadius, setPendingRadius] = useState<number>(radius);
    const latestViewedTrekId = useRef<number | string | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    // Batch map updates using requestAnimationFrame to avoid jank when switching modules
    const rafPolylines = useRef<number | null>(null);
    const rafMarkers = useRef<number | null>(null);
    const rafCircleMarkers = useRef<number | null>(null);
    const rafFitBounds = useRef<number | null>(null);

    const scheduleSetPolylines = (val: any) => {
        if (rafPolylines.current) cancelAnimationFrame(rafPolylines.current);
        rafPolylines.current = requestAnimationFrame(() => {
            setPolylines(val);
            rafPolylines.current = null;
        });
    };
    const scheduleSetMarkers = (val: any) => {
        if (rafMarkers.current) cancelAnimationFrame(rafMarkers.current);
        rafMarkers.current = requestAnimationFrame(() => {
            setMarkers(val);
            rafMarkers.current = null;
        });
    };
    const scheduleSetCircleMarkers = (val: any) => {
        if (rafCircleMarkers.current) cancelAnimationFrame(rafCircleMarkers.current);
        rafCircleMarkers.current = requestAnimationFrame(() => {
            setCircleMarkers(val);
            rafCircleMarkers.current = null;
        });
    };
    const scheduleSetFitBounds = (val: any) => {
        if (rafFitBounds.current) cancelAnimationFrame(rafFitBounds.current);
        rafFitBounds.current = requestAnimationFrame(() => {
            setFitBounds(val);
            rafFitBounds.current = null;
        });
    };

    useEffect(() => {
        // keep pending controls in sync when filters/radius change externally (e.g., Reset)
        setPendingFilters(filters);
        setPendingRadius(radius);
    }, [filters, radius]);

    // wishlist is managed by WishlistContext
    const toggleSaveTrek = (trek: Trek) => toggleTrek({ ...trek, isSaved: !!isSaved(trek.id) });

    const searchLocationAndZoom = async (query: string) => {
        if (!query.trim()) return;

        setLoading(true);
        setStatus('🔍 Searching for location...');

        try {
            const location = await geocodeLocation(query);
            if (location) {
                const { lat, lng } = location;
                const INDIA_BBOX = { south: 6.746778, west: 68.1097, north: 35.674545, east: 97.39556 };

                if (lat < INDIA_BBOX.south || lat > INDIA_BBOX.north || lng < INDIA_BBOX.west || lng > INDIA_BBOX.east) {
                    setStatus('⚠️ Location is outside India. Trek search is limited to Indian territory.');
                    setLoading(false);
                    return;
                }

                setMapCenter([lat, lng]);
                setMapZoom(12);
                setMarkers([{ coords: [lat, lng], title: location.name }]);
                setStatus(`📍 Found: ${location.name}. Searching for treks here...`);

                setLoading(true);
                const searchRadius = (pendingRadius || radius) * 1000;
                const overpassQuery = `
                                        [out:json][timeout:25];
                                        (
                                            way(around:${searchRadius},${lat},${lng})["route"="hiking"];
                                            relation(around:${searchRadius},${lat},${lng})["route"="hiking"];
                                            way(around:${searchRadius},${lat},${lng})["highway"~"path|track|footway"]["sac_scale"];
                                            way(around:${searchRadius},${lat},${lng})["highway"~"path|track"]["name"];
                                            way(around:${searchRadius},${lat},${lng})["highway"~"path|track"]["incline"];
                                        );
                                        out geom;`;

                // cancel any prior search
                if (searchAbortRef.current) searchAbortRef.current.abort();
                const controller = new AbortController();
                searchAbortRef.current = controller;

                const data = await runOverpass(overpassQuery, controller.signal);
                const ways = buildWaysFromOverpass(data);

                const enhanced: Trek[] = ways.map((w) => {
                    const first = w.coords && w.coords.length ? w.coords[0] : null;
                    const dist = first ? haversineDistance([lat, lng], first) : Infinity;
                    const sacScale = w.tags.sac_scale || '';
                    let difficulty: 'Easy' | 'Moderate' | 'Hard' = 'Easy';
                    if (sacScale.includes('mountain_hiking') || sacScale.includes('demanding')) difficulty = 'Moderate';
                    if (sacScale.includes('alpine') || sacScale.includes('difficult')) difficulty = 'Hard';
                    if (w.tags.difficulty === 'intermediate') difficulty = 'Moderate';
                    if (w.tags.difficulty === 'advanced' || w.tags.difficulty === 'expert') difficulty = 'Hard';
                    const pathLength = w.coords.length > 1 ? estimatePathLength(w.coords) : 0;
                    const durationHrs = Math.max(1, Math.round((pathLength / 1000) / 4));
                    return {
                        id: w.id,
                        tags: w.tags,
                        coords: w.coords,
                        distance: dist,
                        difficulty,
                        duration: durationHrs,
                        length: pathLength,
                        safety: Math.min(5, 3 + Math.floor(Math.random() * 3)),
                    };
                }).sort((a, b) => a.distance - b.distance);

                setAllResults(enhanced);
                setLoading(false);
                setStatus(`🎯 Found ${enhanced.length} trek${enhanced.length !== 1 ? 's' : ''} near ${location.name}`);

                setCircleMarkers([]);
                setFitBounds(undefined);

                const newPolylines: Array<{ coords: [number, number][]; color: string; weight?: number; opacity?: number; dashArray?: string; popup?: string; lineCap?: 'butt' | 'round' | 'square' }> = enhanced.slice(0, 50).map((w) => ({
                    coords: w.coords,
                    color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                    weight: 3,
                    opacity: 0.85
                }));
                setPolylines(newPolylines);

            } else {
                setStatus('❌ Location not found. Make sure the city/location name is spelled correctly (e.g., "Manali", "Nashik", "Rishikesh").');
                setLoading(false);
            }
        } catch (err: any) {
            if (err && err.name === 'AbortError') {
                setStatus('Search cancelled');
                setLoading(false);
                return;
            }
            console.error('Error searching location:', err);
            setStatus('❌ Error searching location. Please try again.');
            setLoading(false);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        setLoading(true);

        setStatus(`🔍 Scanning within ${pendingRadius || radius} km for treks...`);

        setMarkers([{ coords: [lat, lng], title: 'Search Location' }]);
        setUserMarkerSet(true);
        // If user places a new marker, ensure we are not stuck in "show saved only" mode
        if (filters.showSavedOnly) {
            setFilters({ ...filters, showSavedOnly: false });
        }
        setCircleMarkers([]);
        setFitBounds(undefined);

        try {
            const searchRadius = (pendingRadius || radius) * 1000;
            const query = `
                            [out:json][timeout:25];
                            (
                                way(around:${searchRadius},${lat},${lng})["route"="hiking"];
                                relation(around:${searchRadius},${lat},${lng})["route"="hiking"];
                                way(around:${searchRadius},${lat},${lng})["highway"="path"]["sac_scale"];
                                way(around:${searchRadius},${lat},${lng})["highway"="track"]["tracktype"];
                            );
                            out geom;`;

            if (searchAbortRef.current) searchAbortRef.current.abort();
            const controller = new AbortController();
            searchAbortRef.current = controller;

            const data = await runOverpass(query, controller.signal);
            const ways = buildWaysFromOverpass(data);

            const enhanced: Trek[] = ways.map((w) => {
                const first = w.coords && w.coords.length ? w.coords[0] : null;
                const dist = first ? haversineDistance([lat, lng], first) : Infinity;
                const sacScale = w.tags.sac_scale || '';
                let difficulty: 'Easy' | 'Moderate' | 'Hard' = 'Easy';
                if (sacScale.includes('mountain_hiking') || sacScale.includes('demanding')) difficulty = 'Moderate';
                if (sacScale.includes('alpine') || sacScale.includes('difficult')) difficulty = 'Hard';
                if (w.tags.difficulty === 'intermediate') difficulty = 'Moderate';
                if (w.tags.difficulty === 'advanced' || w.tags.difficulty === 'expert') difficulty = 'Hard';
                const pathLength = w.coords.length > 1 ? estimatePathLength(w.coords) : 0;
                const durationHrs = Math.max(1, Math.round((pathLength / 1000) / 4));
                let safety = 3;
                if (w.tags.surface === 'paved' || w.tags.highway === 'track') safety = 4;
                if (sacScale.includes('alpine') || w.tags.hazard) safety = 2;
                const popularity = w.tags.name ? 3 : 2;
                return {
                    id: w.id,
                    tags: w.tags,
                    coords: w.coords,
                    distance: dist,
                    difficulty,
                    duration: durationHrs,
                    length: pathLength,
                    safety,
                    popularity,
                };
            })
                .filter((w) => {
                    if (!w.coords || w.coords.length < 2) return false;
                    if (w.tags.name) return true;
                    if (w.tags.sac_scale || w.tags.route === 'hiking') return true;
                    return w.length > 500;
                });

            const unique = new Map<number | string, Trek>();
            enhanced.forEach((w) => { if (!unique.has(w.id)) unique.set(w.id, w); });
            const list = Array.from(unique.values());
            setAllResults(list);

            const newPolylines: Array<{ coords: [number, number][]; color: string; weight?: number; opacity?: number; dashArray?: string; popup?: string; lineCap?: 'butt' | 'round' | 'square' }> = list.slice(0, 50).map((w) => ({
                coords: w.coords,
                color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                weight: 3,
                opacity: 0.85
            }));
            setPolylines(newPolylines);

            if (list.length > 0) {
                const closestDist = (list[0].distance / 1000).toFixed(1);
                setStatus(`✅ Found ${list.length} trek${list.length > 1 ? 's' : ''} — Closest: ${closestDist} km away`);
            } else {
                setStatus('❌ No treks found matching your filters. Try adjusting criteria.');
            }
            setLoading(false);
        } catch (err: any) {
            if (err && err.name === 'AbortError') {
                setStatus('Search cancelled');
                setLoading(false);
                return;
            }
            console.error(err);
            setStatus('❌ Error searching treks. Please try again.');
            setLoading(false);
        }
    };

    const fetchRouteFromOSRM = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                return data.routes[0];
            }
            return null;
        } catch (error) {
            console.error("OSRM Routing failed:", error);
            return null;
        }
    };

    const viewRoute = async (trek: Trek) => {
        if (!trek.coords || !trek.coords.length) return;
        latestViewedTrekId.current = trek.id;

        let newPolylines: Array<{ coords: [number, number][]; color: string; weight?: number; opacity?: number; dashArray?: string; popup?: string; lineCap?: 'butt' | 'round' | 'square' }> = [{
            coords: trek.coords,
            color: '#FFD700',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round' as const
        }];

        let newCircleMarkers = [];

        if (trek.coords.length > 0) {
            newCircleMarkers.push({
                coords: trek.coords[0],
                radius: 8,
                fillColor: '#2bff88',
                color: '#ffffff',
                popup: '<b>Start Point</b>'
            });
        }
        if (trek.coords.length > 1) {
            newCircleMarkers.push({
                coords: trek.coords[trek.coords.length - 1],
                radius: 8,
                fillColor: '#ff4444',
                color: '#ffffff',
                popup: '<b>End Point</b>'
            });
        }

        if (markers.length > 0) {
            const userLatLng = { lat: markers[0].coords[0], lng: markers[0].coords[1] };
            const startLatLng = { lat: trek.coords[0][0], lng: trek.coords[0][1] };

            setStatus('🚗 Calculating route to trailhead...');
            const routeData = await fetchRouteFromOSRM(userLatLng, startLatLng);

            if (latestViewedTrekId.current === trek.id) {
                if (routeData) {
                    // OSRM snaps to nearest path. To ensure end-to-end connection, 
                    // we prepend the exact marker and append the exact trailhead.
                    const routeCoords: [number, number][] = [
                        [userLatLng.lat, userLatLng.lng],
                        ...routeData.geometry.coordinates.map((c: number[]) => [c[1], c[0]]),
                        [startLatLng.lat, startLatLng.lng]
                    ];

                    const distanceKm = (routeData.distance / 1000).toFixed(1);
                    const durationMins = Math.round(routeData.duration / 60);

                    newPolylines.push({
                        coords: routeCoords,
                        color: '#3b82f6',
                        weight: 6,
                        opacity: 1,
                        lineCap: 'round' as const,
                        popup: `<div style="text-align:center"><b>🚶 Walking Route to Start</b><br/>${distanceKm} km • ~${durationMins} mins</div>`
                    });
                    setStatus(`✅ Walking route found: ${distanceKm}km to trailhead.`);
                } else {
                    newPolylines.push({
                        coords: [markers[0].coords, trek.coords[0]],
                        color: '#3b82f6',
                        weight: 3,
                        opacity: 0.7,
                        dashArray: '10, 10',
                        popup: `<b>Straight Line Distance:</b> ${(trek.distance / 1000).toFixed(2)} km`
                    });
                    setStatus('⚠️ Could not find road route. Showing straight line.');
                }
            }
        }

        setPolylines(newPolylines);
        setCircleMarkers(newCircleMarkers as any);

        let boundsPoints = [...trek.coords];
        if (markers.length > 0) {
            boundsPoints.push(markers[0].coords);
        }
        setFitBounds(boundsPoints);

        if (onSelectTrek) {
            onSelectTrek({
                name: trek.tags.name || `Trek #${trek.id}`,
                difficulty: trek.difficulty,
                distance: trek.distance,
                length: trek.length,
                duration: trek.duration,
                coords: trek.coords,
            });
        }
    };

    const handleReset = () => {
        setResults([]);
        setAllResults([]);
        setLocationSearchQuery('');
        setRadius(60);
        setPolylines([]);
        setMarkers([]);
        setCircleMarkers([]);
        setFitBounds(undefined);
        setMapCenter([22.5937, 78.9629]);
        setMapZoom(5);
        setFilters({ difficulty: 'all', duration: 'all', sortBy: 'distance', showSavedOnly: false });
        setStatus('');
        setUserMarkerSet(false);
    };

    const applyFilters = (data: Trek[], f: Filters, nameFilter?: string): Trek[] => {
        let filtered = [...data];
        filtered = filtered.map((t: Trek) => ({ ...t, isSaved: savedIds.has(t.id) }));
        if (f.showSavedOnly) filtered = filtered.filter((t: Trek) => t.isSaved);
        if (nameFilter && nameFilter.trim()) {
            const q = nameFilter.toLowerCase();
            filtered = filtered.filter((t: Trek) =>
                (t.tags.name && t.tags.name.toLowerCase().includes(q)) ||
                (t.tags.description && t.tags.description.toLowerCase().includes(q)) ||
                (t.tags.ref && t.tags.ref.toLowerCase().includes(q))
            );
        }
        if (f.difficulty !== 'all') filtered = filtered.filter((t: Trek) => t.difficulty === f.difficulty);
        if (f.duration !== 'all') {
            if (f.duration === 'short') filtered = filtered.filter((t: Trek) => t.duration <= 3);
            else if (f.duration === 'medium') filtered = filtered.filter((t: Trek) => t.duration > 3 && t.duration <= 8);
            else if (f.duration === 'long') filtered = filtered.filter((t: Trek) => t.duration > 8);
        }
        const diffOrder: Record<string, number> = { Easy: 1, Moderate: 2, Hard: 3 };
        if (f.difficulty === 'all') {
            filtered.sort((a, b) => {
                const diffCompare = diffOrder[a.difficulty] - diffOrder[b.difficulty];
                return diffCompare !== 0 ? diffCompare : a.distance - b.distance;
            });
        } else if (f.sortBy === 'distance') {
            filtered.sort((a, b) => a.distance - b.distance);
        } else if (f.sortBy === 'difficulty') {
            filtered.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
        }
        return filtered;
    };

    async function fetchTreksFromSupabase(opts: { name?: string; lat?: number; lng?: number; radiusKm?: number; difficulty?: string; duration?: string; sortBy?: string; showSavedOnly?: boolean }) {
        if (!supabase) return null;
        try {
            const { name, lat = mapCenter[0], lng = mapCenter[1], radiusKm = radius, difficulty } = opts;

            // Convert difficulty to smallint for RPC if needed, or use raw filter
            // The RPC search_treks accepts p_difficulty as integer (1,2,3)
            let diffInt: number | null = null;
            if (difficulty === 'Easy') diffInt = 1;
            if (difficulty === 'Moderate') diffInt = 2;
            if (difficulty === 'Hard') diffInt = 3;

            // Use the RPC 'search_treks' which is optimized for PostGIS
            const { data, error } = await supabase.rpc('search_treks', {
                p_lat: lat,
                p_lng: lng,
                p_radius_m: (radiusKm || 30) * 1000,
                // p_difficulty: diffInt, // Pass if filtering by difficulty
                // p_tags: name ? [name] : null // Check if your RPC supports name/text search
            });

            if (error) {
                console.error('Supabase RPC error:', error);
                throw error;
            }

            // Map RPC result to Trek interface
            return (data || []).map((d: any) => ({
                id: d.id, // UUID string
                tags: {
                    name: d.title,
                    description: d.description,
                    ...d.tags
                },
                // Note: The current RPC might not return 'geom' or 'lat/lng'. 
                // You MUST update the RPC to return lat/lng or geom to properly position markers.
                // Assuming d.lat/d.lng or d.geom is available or we default to search center (fallback)
                coords: (d.lat && d.lng) ? [[d.lat, d.lng]] : [[lat, lng]],
                distance: d.distance_m || 0,
                difficulty: d.difficulty === 1 ? 'Easy' : d.difficulty === 2 ? 'Moderate' : 'Hard',
                duration: d.length_km ? Math.round(d.length_km / 4) : 1, // Estimate
                length: (d.length_km || 0) * 1000,
                safety: 4, // Default
                popularity: 3,
            } as Trek));
        } catch (err) {
            console.warn('Supabase trek query failed, falling back to client filtering:', err);
            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        const doFilter = async () => {
            // If user requested to show saved only, derive results from wishlist
            if (filters.showSavedOnly) {
                if (!cancelled) {
                    const list: Trek[] = (savedTreks || []).map((s) => ({
                        id: s.id,
                        tags: s.tags || {},
                        coords: s.coords || [],
                        distance: (s.distance as number) || Infinity,
                        difficulty: (s.difficulty as any) || 'Moderate',
                        duration: (s.duration as number) || 1,
                        length: (s.length as number) || 0,
                        safety: (s.safety as number) || 3,
                        popularity: s.popularity,
                        isSaved: true,
                    }));

                    const filtered = applyFilters(list, filters, trekNameFilter);
                    setResults(filtered.slice(0, 50));

                    // Only update polylines/markers/center when user has NOT manually set a marker
                    if (!userMarkerSet && circleMarkers.length === 0) {
                        const resPolylines = filtered.slice(0, 50).map((w) => ({
                            coords: w.coords,
                            color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                            weight: 3,
                            opacity: 0.85,
                        }));
                        setPolylines(resPolylines);
                        // If we have saved treks with coords, center the map on the first one
                        const firstWithCoords = filtered.find((f) => f.coords && f.coords.length > 0);
                        if (firstWithCoords) {
                            const firstCoord = firstWithCoords.coords[0];
                            setMarkers([{ coords: firstCoord, title: generateTrekName(firstWithCoords.tags, firstWithCoords.difficulty, firstWithCoords.length) }]);
                            setMapCenter([firstCoord[0], firstCoord[1]]);
                            setMapZoom(12);
                            setFitBounds(firstWithCoords.coords);
                        }
                    }
                }
                return;
            }

            // Default behavior: fetch server results if possible, otherwise filter local allResults
            if (supabase) {
                const lat = markers.length > 0 ? markers[0].coords[0] : mapCenter[0];
                const lng = markers.length > 0 ? markers[0].coords[1] : mapCenter[1];
                const serverResults = await fetchTreksFromSupabase({ name: trekNameFilter, lat, lng, radiusKm: radius, difficulty: filters.difficulty, duration: filters.duration, sortBy: filters.sortBy });

                // Only use server results if they are non-empty. 
                // If they are empty, we fall back to OSM results (allResults).
                if (!cancelled && serverResults && serverResults.length > 0) {
                    const withSaved = serverResults.map((t: Trek) => ({ ...t, isSaved: savedIds.has(t.id) }));
                    let final = [...withSaved];
                    if (filters.duration !== 'all') {
                        if (filters.duration === 'short') final = final.filter((t: Trek) => t.duration <= 3);
                        else if (filters.duration === 'medium') final = final.filter((t: Trek) => t.duration > 3 && t.duration <= 8);
                        else if (filters.duration === 'long') final = final.filter((t: Trek) => t.duration > 8);
                    }
                    const diffOrder: Record<string, number> = { Easy: 1, Moderate: 2, Hard: 3 };
                    if (filters.difficulty === 'all') {
                        final.sort((a, b) => {
                            const diffCompare = diffOrder[a.difficulty] - diffOrder[b.difficulty];
                            return diffCompare !== 0 ? diffCompare : a.distance - b.distance;
                        });
                    } else if (filters.sortBy === 'distance') {
                        final.sort((a, b) => a.distance - b.distance);
                    } else if (filters.sortBy === 'difficulty') {
                        final.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
                    }

                    setResults(final.slice(0, 50));
                    if (!userMarkerSet && circleMarkers.length === 0) {
                        const resPolylines = final.slice(0, 50).map((w) => ({
                            coords: w.coords,
                            color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                            weight: 3,
                            opacity: 0.85,
                        }));
                        setPolylines(resPolylines);
                    }
                    return;
                }
            }

            if (!cancelled) {
                const filtered = applyFilters(allResults, filters, trekNameFilter);
                setResults(filtered.slice(0, 50));
                if (!userMarkerSet && circleMarkers.length === 0) {
                    const resPolylines = filtered.slice(0, 50).map((w) => ({
                        coords: w.coords,
                        color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                        weight: 3,
                        opacity: 0.85,
                    }));
                    setPolylines(resPolylines);
                }
            }
        };

        doFilter();
        return () => { cancelled = true; };
    }, [filters, allResults, trekNameFilter, savedTreks, markers, mapCenter, radius]);

    return (
        <div className={styles['trek-finder-bg']}>
            <div className={styles['trek-finder']}>
                <div className={styles['trek-map']}>
                    <MapFeature
                        center={mapCenter}
                        zoom={mapZoom}
                        markers={markers}
                        polylines={polylines}
                        circleMarkers={circleMarkers}
                        fitBounds={fitBounds}
                        pitch={mapPitch}
                        onMapClick={handleMapClick}
                    />
                </div>

                <div className={styles['trek-sidebar']}>
                    <div className={styles['sidebar-header']}>
                        <h3>Find Your Trek</h3>
                    </div>

                    <div className={styles['search-bar']}>
                        <input
                            type="text"
                            placeholder="Find location on map..."
                            value={locationSearchQuery}
                            onChange={(e) => setLocationSearchQuery(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') searchLocationAndZoom(locationSearchQuery); }}
                            className={styles['search-input']}
                        />
                        <button
                            onClick={() => searchLocationAndZoom(locationSearchQuery)}
                            disabled={loading || !locationSearchQuery.trim()}
                            className={styles['search-button']}
                            title="Search location"
                        >
                            <Search size={20} />
                        </button>
                        <button
                            onClick={handleReset}
                            className={styles['search-button']}
                            title="Reset Map"
                            style={{ background: 'rgba(255, 68, 68, 0.2)', border: '1px solid rgba(255, 68, 68, 0.4)', color: '#ff8888' }}
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>

                    <div className={styles['controls']}>
                        <div className={styles['control-group']}>
                            <label>Search Radius</label>
                            <select value={pendingRadius} onChange={(e) => setPendingRadius(Number(e.target.value))} disabled={loading}>
                                <option value={60}>60 km (Default)</option>
                                <option value={100}>100 km</option>
                                <option value={150}>150 km</option>
                            </select>
                        </div>
                        <div className={styles['control-group']}>
                            <label>Difficulty</label>
                            <select value={pendingFilters.difficulty} onChange={(e) => setPendingFilters({ ...pendingFilters, difficulty: e.target.value })}>
                                <option value="all">All Levels</option>
                                <option value="Easy">Easy</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                        <div className={styles['control-group']}>
                            <label>Duration</label>
                            <select value={pendingFilters.duration} onChange={(e) => setPendingFilters({ ...pendingFilters, duration: e.target.value })}>
                                <option value="all">All</option>
                                <option value="short">Short (&le; 3h)</option>
                                <option value="medium">Medium (3-8h)</option>
                                <option value="long">Long (&gt; 8h)</option>
                            </select>
                        </div>
                        <div className={styles['control-group']}>
                            <label>Sort By</label>
                            <select value={pendingFilters.sortBy} onChange={(e) => setPendingFilters({ ...pendingFilters, sortBy: e.target.value })}>
                                <option value="distance">Distance</option>
                                <option value="difficulty">Difficulty</option>
                            </select>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <button
                                className={styles['search-button']}
                                onClick={() => {
                                    setFilters(pendingFilters);
                                    setRadius(pendingRadius);
                                }}
                                disabled={
                                    pendingFilters.difficulty === filters.difficulty &&
                                    pendingFilters.duration === filters.duration &&
                                    pendingFilters.sortBy === filters.sortBy &&
                                    pendingFilters.showSavedOnly === filters.showSavedOnly &&
                                    pendingRadius === radius
                                }
                            >
                                Apply Filters
                            </button>
                        </div>
                        <div className={styles['control-group']}>
                            <label>Map View Angle</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <button
                                    onClick={() => setMapPitch(0)}
                                    className={styles['search-button']}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px', background: mapPitch === 0 ? '#2bff88' : 'rgba(255,255,255,0.05)', color: mapPitch === 0 ? '#0a1612' : '#ffffff' }}
                                >
                                    2D View
                                </button>
                                <button
                                    onClick={() => setMapPitch(60)}
                                    className={styles['search-button']}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px', background: mapPitch > 0 ? '#2bff88' : 'rgba(255,255,255,0.05)', color: mapPitch > 0 ? '#0a1612' : '#ffffff' }}
                                >
                                    3D View
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles['trek-counter']}>
                        <button
                            className={styles['search-button']}
                            style={{ background: pendingFilters.showSavedOnly ? '#ff4444' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', marginLeft: '10px' }}
                            onClick={() => setPendingFilters({ ...pendingFilters, showSavedOnly: !pendingFilters.showSavedOnly })}
                            title="Show Saved Only"
                        >
                            <Heart size={20} fill={pendingFilters.showSavedOnly ? "white" : "none"} />
                        </button>
                        <span className={styles['counter-text']}>{results.length} Trek{results.length !== 1 ? 's' : ''} Found</span>
                    </div>

                    <div className={styles['results']}>
                        {results.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                No results yet. Click on the map to start exploring.
                            </div>
                        )}
                        {loading && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#4a7c4e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Loader className="animate-spin" size={20} /> Loading treks...
                            </div>
                        )}
                        {results.map((r) => (
                            <div key={r.id} id={`trek-card-${r.id}`} className={`${styles['result-item']} ${r.isSaved ? styles['saved-item'] : ''}`}>
                                <div className={styles['result-header']}>
                                    <div className={styles['result-title']}>{generateTrekName(r.tags, r.difficulty, r.length)}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSaveTrek(r); }}
                                        className={styles['save-btn']}
                                        title={isSaved(r.id) ? "Remove from saved" : "Save trek"}
                                    >
                                        <Heart size={18} fill={isSaved(r.id) ? "#ff4444" : "none"} color={isSaved(r.id) ? "#ff4444" : "#888"} />
                                    </button>
                                </div>
                                <div className={styles['result-badges']}>
                                    <span className={`${styles['badge']} ${styles[`difficulty-${r.difficulty.toLowerCase()}`]}`}>{r.difficulty}</span>
                                    <span className={styles['badge']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {r.duration}h</span>
                                    <span className={styles['badge']} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        {Array(r.safety).fill(0).map((_, i) => (<Star key={i} size={12} fill="#FFD700" color="#FFD700" />))}
                                    </span>
                                </div>
                                <div className={styles['result-meta']}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {(r.distance / 1000).toFixed(1)} km away</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Ruler size={14} /> {(r.length / 1000).toFixed(1)} km trek</span>
                                </div>
                                <button className={styles['view-route-btn']} onClick={() => viewRoute(r)}>View Route</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function FinderPage() {
    const router = useRouter();
    return (
        <TrekFinder
            onSelectTrek={(trek) => { console.log('Selected trek:', trek); /* router.push(`/trek/${trek.id}`) */ }}
            onClose={() => router.push('/')}
        />
    );
}
