'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import styles from '@/styles/TrekFinder.module.css';
import designStyles from '@/styles/DesignSystem.module.css';
import { Search, Heart, RotateCcw, LocateFixed, Layers, Plus, Minus, SlidersHorizontal, Clock, Mountain, MapPin, Filter } from 'lucide-react';
import { fetchWithStaleWhileRevalidate, makeCacheKey } from '@/shared/utils/fetchCache';
import { supabase } from '@/shared/services/supabaseClient';
import TrekCard from '@/components/TrekCard';

const MapFeature = dynamic(() => import('@/components/MapFeature'), {
    ssr: false,
    loading: () => <div className={styles['trek-map']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2bff88' }}>Loading Map...</div>
});

// Default map center: top of K2 (when no location permission)
const DEFAULT_MAP_CENTER: [number, number] = [35.8813, 76.5142];

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

interface OverpassElement {
    type: string;
    id: number;
    tags?: Record<string, string>;
    geometry?: Array<{ lat: number; lon: number }>;
    nodes?: number[];
    center?: { lat: number; lon: number };
    lat?: number;
    lon?: number;
}

interface OverpassResponse {
    elements?: OverpassElement[];
}

interface NominatimResult {
    lat: string;
    lon: string;
    display_name: string;
}

interface Polyline {
    coords: [number, number][];
    color: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    popup?: string;
    lineCap?: 'butt' | 'round' | 'square';
}

interface CircleMarker {
    coords: [number, number];
    color: string;
    fillColor?: string;
    radius: number;
    popup?: string;
}

interface TrekSelection {
    name: string;
    difficulty: Trek['difficulty'];
    distance: number;
    length: number;
    duration: number;
    coords: [number, number][];
}

interface OSRMRoute {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
}

interface OSRMResponse {
    code: string;
    routes?: OSRMRoute[];
}

interface SearchTrekResult {
    id: string;
    title: string;
    description?: string | null;
    tags?: Record<string, string> | null;
    lat?: number | null;
    lng?: number | null;
    distance_m?: number | null;
    difficulty?: number | null;
    length_km?: number | null;
}

const INDIA_BBOX = { south: 6.746778, west: 68.1097, north: 35.674545, east: 97.39556 };

async function runOverpass(query: string, externalSignal?: AbortSignal): Promise<OverpassResponse> {
    const key = makeCacheKey('overpass', query);
    return fetchWithStaleWhileRevalidate(
        key,
        async () => {
            const endpoints = [
                'https://overpass-api.de/api/interpreter',
                'https://overpass.kumi.systems/api/interpreter',
                'https://overpass.openstreetmap.fr/api/interpreter',
            ];

            let lastError: unknown = null;
            const maxAttempts = 2;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                for (const url of endpoints) {
                    if (externalSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

                    try {
                        const controller = new AbortController();
                        const timeoutMs = 12000 * attempt;
                        const timer = setTimeout(() => controller.abort(), timeoutMs);
                        const combinedSignal = externalSignal
                            ? new AbortController()
                            : controller;

                        if (externalSignal) {
                            const externalListener = () => combinedSignal.abort();
                            externalSignal.addEventListener('abort', externalListener);
                        }

                        const resp = await fetch(url, {
                            method: 'POST',
                            body: query,
                            headers: { 'Content-Type': 'text/plain' },
                            signal: combinedSignal.signal,
                        });

                        clearTimeout(timer);

                        if (externalSignal && externalSignal.aborted) {
                            throw new DOMException('Aborted', 'AbortError');
                        }

                        if (!resp.ok) {
                            lastError = new Error(`Overpass error: ${resp.status}`);
                            if (resp.status >= 500 && resp.status < 600) continue;
                            throw lastError;
                        }

                        return await resp.json() as OverpassResponse;
                    } catch (err) {
                        lastError = err;
                    }
                }

                await new Promise((r) => setTimeout(r, 300 * attempt));
            }

            throw lastError || new Error('Overpass fetch failed');
        },
        1000 * 60 * 5
    );
}

function buildWaysFromOverpass(data: OverpassResponse): Way[] {
    const ways: Way[] = [];
    const elements = data.elements ?? [];

    elements.forEach((el) => {
        try {
            if (el.type === 'way' || el.type === 'relation') {
                let coords: [number, number][] = [];

                if (el.geometry && Array.isArray(el.geometry) && el.geometry.length) {
                    coords = el.geometry.map((point): [number, number] => [point.lat, point.lon]);
                } else if (el.nodes?.length) {
                    const nodeMap = new Map<number, [number, number]>();
                    elements.forEach((node) => {
                        if (node.type === 'node' && node.lat !== undefined && node.lon !== undefined) {
                            nodeMap.set(node.id, [node.lat, node.lon]);
                        }
                    });
                    coords = el.nodes.map((nodeId) => nodeMap.get(nodeId)).filter(
                        (coord): coord is [number, number] => coord !== undefined
                    );
                }

                if (coords.length) {
                    const MAX_POINTS = 800;
                    if (coords.length > MAX_POINTS) {
                        const step = Math.ceil(coords.length / MAX_POINTS);
                        coords = coords.filter((_, i) => i % step === 0);
                    }

                    ways.push({ id: el.id, tags: el.tags || {}, coords, center: el.center });
                }
            }
        } catch {
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
            let data = await response.json() as NominatimResult[];

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
    onSelectTrek?: (trek: TrekSelection) => void;
    onClose?: () => void;
}

const TrekFinder: React.FC<TrekFinderProps> = ({ onSelectTrek }) => {
    // Map State
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [mapZoom, setMapZoom] = useState(8);
    const [mapPitch, setMapPitch] = useState(0); // default 2D
    const [terrainEnabled, setTerrainEnabled] = useState(true);
    const [selectedTrek, setSelectedTrek] = useState<Trek | null>(null);

    const [markers, setMarkers] = useState<Array<{ coords: [number, number]; title?: string }>>([]);
    const [polylines, setPolylines] = useState<Polyline[]>([]);
    const [circleMarkers, setCircleMarkers] = useState<CircleMarker[]>([]);
    const [fitBounds, setFitBounds] = useState<[number, number][] | undefined>(undefined);
    const [userMarkerSet, setUserMarkerSet] = useState(false);

    // Logic State
    const [results, setResults] = useState<Trek[]>([]);
    const [allResults, setAllResults] = useState<Trek[]>([]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [radius, setRadius] = useState(100); // default 100km
    const trekNameFilter = '';
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
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Supabase bookmarks (replaces localStorage wishlist)
    const [savedIds, setSavedIds] = useState<Set<number | string>>(new Set());
    const [isAuthReady, setIsAuthReady] = useState(false);

    const latestViewedTrekId = useRef<number | string | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);


    // Check auth and load bookmarks from Supabase
    useEffect(() => {
        let active = true;
        const initAuth = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (!active) return;
                if (error) {
                    console.warn('Supabase auth check failed:', error.message);
                }
                if (user) {
                    loadBookmarks(user.id);
                }
                setIsAuthReady(true);
            } catch (err) {
                console.warn('Supabase auth init failed:', err);
                setIsAuthReady(true);
            }
        };
        void initAuth();
        return () => { active = false; };
    }, []);

    const loadBookmarks = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('trek_id')
                .eq('user_id', userId);
            if (!error && data) {
                setSavedIds(new Set(data.map((b) => b.trek_id)));
            }
        } catch (err) {
            console.warn('Failed to load bookmarks:', err);
        }
    }, []);

    const toggleSaveTrekSupabase = useCallback(async (trek: Trek) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setStatus('Please log in to save treks.');
            return;
        }

        const currentlySaved = savedIds.has(trek.id);
        if (currentlySaved) {
            await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('trek_id', trek.id);
            setSavedIds((prev) => { const next = new Set(prev); next.delete(trek.id); return next; });
        } else {
            await supabase.from('bookmarks').insert({ user_id: user.id, trek_id: trek.id });
            setSavedIds((prev) => { const next = new Set(prev); next.add(trek.id); return next; });
        }
    }, [savedIds]);

    const isSaved = (id: number | string): boolean => savedIds.has(id);

    // Shared helper: runs an Overpass query near a point, enhances each way into a Trek
    async function fetchOverpassTreks({
        lat,
        lng,
        overpassQuery,
        safetyMode = 'random',
        addPopularity = false,
        dedupe = false,
        extraFilter = null,
    }: {
        lat: number;
        lng: number;
        overpassQuery: string;
        safetyMode?: 'random' | 'tags';
        addPopularity?: boolean;
        dedupe?: boolean;
        extraFilter?: ((w: Trek) => boolean) | null;
    }): Promise<Trek[]> {
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

            let safety = 3;
            let popularity: number | undefined = 2;
            if (safetyMode === 'tags') {
                if (w.tags.surface === 'paved' || w.tags.highway === 'track') safety = 4;
                if (sacScale.includes('alpine') || w.tags.hazard) safety = 2;
                if (addPopularity && w.tags.name) popularity = 3;
            } else {
                safety = Math.min(5, 3 + Math.floor(Math.random() * 3));
            }

            return {
                id: w.id,
                tags: w.tags,
                coords: w.coords,
                distance: dist,
                difficulty,
                duration: durationHrs,
                length: pathLength,
                safety,
                ...(addPopularity ? { popularity } : {}),
            };
        });

        let result = enhanced;
        if (extraFilter) result = result.filter(extraFilter);
        if (dedupe) {
            const unique = new Map<number | string, Trek>();
            result.forEach((w) => { if (!unique.has(w.id)) unique.set(w.id, w); });
            result = Array.from(unique.values());
        }
        return result.sort((a, b) => a.distance - b.distance);
    }

    // Request location permission and center map on user's approx location
    useEffect(() => {
        if (!navigator.geolocation) {
            setStatus('Location is not available in this browser.');
            return;
        }
        setStatus('Detecting your location...');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setMapCenter([coords.latitude, coords.longitude]);
                setMapZoom(12);
                setUserMarkerSet(true);
                setMarkers([{ coords: [coords.latitude, coords.longitude], title: 'Your Location' }]);
                setStatus('Location found. Searching for treks...');
                void handleMapClick(coords.latitude, coords.longitude);
            },
            () => {
                // Permission denied or unavailable — keep K2 default
                setStatus('Using default location (K2). Allow location access to center on you.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    const searchLocationAndZoom = async (query: string) => {
        if (!query.trim()) return;

        setLoading(true);
        setStatus('🔍 Searching for location...');

        try {
            const location = await geocodeLocation(query);
            if (location) {
                const { lat, lng } = location;

                if (lat < INDIA_BBOX.south || lat > INDIA_BBOX.north || lng < INDIA_BBOX.west || lng > INDIA_BBOX.east) {
                    setStatus('⚠️ Location is outside India. Trek search is limited to Indian territory.');
                    setLoading(false);
                    return;
                }

                setMapCenter([lat, lng]);
                setMapZoom(12);
                setUserMarkerSet(true);
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

                const enhanced = await fetchOverpassTreks({
                    lat, lng, overpassQuery,
                    safetyMode: 'random',
                });

                setAllResults(enhanced);
                setLoading(false);
                setStatus(`🎯 Found ${enhanced.length} trek${enhanced.length !== 1 ? 's' : ''} near ${location.name}`);

                setCircleMarkers([]);
                setFitBounds(undefined);

                const newPolylines: Polyline[] = enhanced.slice(0, 30).map((w) => ({
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
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                setStatus('Search cancelled');
                setLoading(false);
                return;
            }
            console.error('Error searching location:', error);
            setStatus('❌ Error searching location. Please try again.');
            setLoading(false);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        setSelectedTrek(null);
        setLoading(true);

        setStatus(`🔍 Scanning within ${pendingRadius || radius} km for treks...`);

        setMarkers([{ coords: [lat, lng], title: 'Search Location' }]);
        setUserMarkerSet(true);
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

            const list = await fetchOverpassTreks({
                lat, lng, overpassQuery: query,
                safetyMode: 'tags',
                addPopularity: true,
                dedupe: true,
                extraFilter: (w) => {
                    if (!w.coords || w.coords.length < 2) return false;
                    if (w.tags.name) return true;
                    if (w.tags.sac_scale || w.tags.route === 'hiking') return true;
                    return w.length > 500;
                },
            });

            setAllResults(list);

            const newPolylines: Polyline[] = list.slice(0, 30).map((w) => ({
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
                setStatus('❌ No treks available based on this place and current filters. Try adjusting the radius or difficulty.');
            }
            setLoading(false);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                setStatus('Search cancelled');
                setLoading(false);
                return;
            }
            console.error(error);
            setStatus('❌ Error searching treks. Please try again.');
            setLoading(false);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            setStatus('Location is not available in this browser.');
            return;
        }
        setStatus('Finding your location...');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => { void handleMapClick(coords.latitude, coords.longitude); },
            () => setStatus('Location permission was denied or unavailable.'),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    const fetchRouteFromOSRM = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json() as OSRMResponse;
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
        setSelectedTrek(trek);

        const newPolylines: Polyline[] = [{
            coords: trek.coords,
            color: '#FFD700',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round' as const
        }];

        const newCircleMarkers: CircleMarker[] = [];

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
                    const routeCoords: [number, number][] = [
                        [userLatLng.lat, userLatLng.lng],
                        ...routeData.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]),
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
        setCircleMarkers(newCircleMarkers);

        const boundsPoints = [...trek.coords];
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
        setRadius(100);
        setPendingRadius(100);
        setPolylines([]);
        setMarkers([]);
        setCircleMarkers([]);
        setFitBounds(undefined);
        setMapCenter(DEFAULT_MAP_CENTER);
        setMapZoom(8);
        setMapPitch(0);
        setSelectedTrek(null);
        setTerrainEnabled(true);
        const defaultFilters: Filters = { difficulty: 'all', duration: 'all', sortBy: 'distance', showSavedOnly: false };
        setFilters(defaultFilters);
        setPendingFilters(defaultFilters);
        setStatus('');
        setUserMarkerSet(false);
    };

    const chooseSavedView = (showSavedOnly: boolean) => {
        const nextFilters = { ...pendingFilters, showSavedOnly };
        setPendingFilters(nextFilters);
        setFilters(nextFilters);
    };

    const applyFilters = React.useCallback((data: Trek[], f: Filters, nameFilter?: string): Trek[] => {
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
    }, [savedIds]);

    const fetchTreksFromSupabase = React.useCallback(async (opts: { lat: number; lng: number; radiusKm: number }) => {
        try {
            const { lat, lng, radiusKm } = opts;

            const { data, error } = await supabase.rpc('search_treks', {
                p_lat: lat,
                p_lng: lng,
                p_radius_m: (radiusKm || 30) * 1000,
            });

            if (error) {
                console.error('Supabase RPC error:', error);
                throw error;
            }

            const rows = (data || []) as SearchTrekResult[];
            return rows.map((d): Trek => {
                const trekDifficulty: Trek['difficulty'] = d.difficulty === 1 ? 'Easy' : d.difficulty === 2 ? 'Moderate' : 'Hard';
                const coords: [number, number][] = d.lat !== undefined && d.lat !== null && d.lng !== undefined && d.lng !== null
                    ? [[d.lat, d.lng]]
                    : [[lat, lng]];
                return {
                    id: d.id,
                    tags: { name: d.title, ...(d.description ? { description: d.description } : {}), ...(d.tags || {}) },
                    coords,
                    distance: d.distance_m || 0,
                    difficulty: trekDifficulty,
                    duration: d.length_km ? Math.round(d.length_km / 4) : 1,
                    length: (d.length_km || 0) * 1000,
                    safety: 4,
                    popularity: 3,
                };
            });
        } catch (err) {
            console.warn('Supabase trek query failed, falling back to client filtering:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const doFilter = async () => {
            // If user requested to show saved only, derive results from Supabase bookmarks
            if (filters.showSavedOnly) {
                if (!cancelled) {
                    const list: Trek[] = [];
                    // Fetch bookmarked trek details from Supabase if user is authenticated
                    if (isAuthReady && savedIds.size > 0) {
                        try {
                            const trekIds = Array.from(savedIds);
                            const { data, error } = await supabase
                                .from('treks')
                                .select('*')
                                .in('id', trekIds);
                            if (!error && data) {
                                for (const t of data) {
                                    const coords: [number, number][] = t.geom
                                        ? [[t.geom?.coordinates?.[1] ?? 0, t.geom?.coordinates?.[0] ?? 0]]
                                        : [[0, 0]];
                                    list.push({
                                        id: t.id,
                                        tags: { name: t.title, ...(t.description ? { description: t.description } : {}), ...(t.tags ? Object.fromEntries(t.tags.map((k: string, v: string) => [k, v])) : {}) },
                                        coords,
                                        distance: 0,
                                        difficulty: t.difficulty === 1 ? 'Easy' : t.difficulty === 2 ? 'Moderate' : 'Hard',
                                        duration: t.length_km ? Math.round(t.length_km / 4) : 1,
                                        length: (t.length_km || 0) * 1000,
                                        safety: 4,
                                        isSaved: true,
                                    });
                                }
                            }
                        } catch (err) {
                            console.warn('Failed to load saved treks from Supabase:', err);
                        }
                    }

                    const filtered = applyFilters(list, filters, trekNameFilter);
                    setResults(filtered.slice(0, 30));

                    if (!userMarkerSet && circleMarkers.length === 0) {
                        const resPolylines = filtered.slice(0, 30).map((w) => ({
                            coords: w.coords,
                            color: w.difficulty === 'Easy' ? '#2bff88' : w.difficulty === 'Moderate' ? '#4a7c4e' : '#ff4444',
                            weight: 3,
                            opacity: 0.85,
                        }));
                        setPolylines(resPolylines);
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
                const serverResults = await fetchTreksFromSupabase({ lat, lng, radiusKm: radius });

                if (!cancelled && serverResults && serverResults.length > 0) {
                    const withSaved = serverResults.map((trek) => ({ ...trek, isSaved: savedIds.has(trek.id) }));
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

                    setResults(final.slice(0, 30));
                    if (!userMarkerSet && circleMarkers.length === 0) {
                        const resPolylines = final.slice(0, 30).map((w) => ({
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
                setResults(filtered.slice(0, 30));
                if (!userMarkerSet && circleMarkers.length === 0) {
                    const resPolylines = filtered.slice(0, 30).map((w) => ({
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
    }, [filters, allResults, trekNameFilter, savedIds, markers, mapCenter, radius, applyFilters, circleMarkers.length, fetchTreksFromSupabase, isAuthReady, userMarkerSet]);

    return (
        <div className={`${styles['trek-finder-bg']} ${designStyles['dark-luxury']} ${designStyles['noise']}`}>
            <main className={styles['finder-stage']}>
                <div className={styles['finder-map']}>
                    <MapFeature
                        center={mapCenter}
                        zoom={mapZoom}
                        markers={markers}
                        polylines={polylines}
                        circleMarkers={circleMarkers}
                        fitBounds={fitBounds}
                        pitch={mapPitch}
                        onMapClick={handleMapClick}
                        terrainEnabled={terrainEnabled}
                    />

                    {/* Search results toast near map top */}
                    {status && <div className={styles['finder-map-status']} role="status" aria-live="polite">{status}</div>}

                    <div className={styles['finder-map-mode']} role="group" aria-label="Map pitch">
                        <button className={mapPitch === 0 ? styles['finder-mode-active'] : ''} onClick={() => setMapPitch(0)}>2D</button>
                        <button className={mapPitch > 0 ? styles['finder-mode-active'] : ''} onClick={() => setMapPitch(60)}>3D</button>
                    </div>

                    <div className={styles['finder-map-tools']}>
                        <button onClick={() => setTerrainEnabled((enabled) => !enabled)} title={terrainEnabled ? 'Flatten terrain' : 'Show terrain'} aria-label={terrainEnabled ? 'Flatten terrain' : 'Show terrain'}>
                            <Layers size={19} />
                        </button>
                        <button onClick={handleLocateMe} title="Find my location" aria-label="Find my location">
                            <LocateFixed size={19} />
                        </button>
                        <div className={styles['finder-zoom-tools']}>
                            <button onClick={() => setMapZoom((zoom) => Math.min(20, zoom + 1))} title="Zoom in" aria-label="Zoom in"><Plus size={19} /></button>
                            <button onClick={() => setMapZoom((zoom) => Math.max(2, zoom - 1))} title="Zoom out" aria-label="Zoom out"><Minus size={19} /></button>
                        </div>
                    </div>

                </div>

                <aside className={`${styles['finder-panel']} ${designStyles['frosted-panel']} ${designStyles['glass-elevated']}`}>
                    <header className={styles['finder-panel-heading']}>
                        <h1>Discover <span>Trails</span></h1>
                        <p>Find, explore and plan your next adventure</p>
                    </header>

                    <form className={styles['finder-search']} onSubmit={(event) => { event.preventDefault(); void searchLocationAndZoom(locationSearchQuery); }}>
                        <Search size={17} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Search trails, peaks or locations..."
                            value={locationSearchQuery}
                            onChange={(e) => setLocationSearchQuery(e.target.value)}
                        />
                        <button type="submit" disabled={loading || !locationSearchQuery.trim()} title="Search location" aria-label="Search location">
                            <Search size={17} />
                        </button>
                        <button type="button" onClick={handleReset} title="Reset map" aria-label="Reset map">
                            <RotateCcw size={20} />
                        </button>
                    </form>

                    <div className={styles['finder-view-tabs']} role="group" aria-label="Trail list view">
                        <button className={!pendingFilters.showSavedOnly ? styles['finder-tab-active'] : ''} onClick={() => chooseSavedView(false)}>
                            <Mountain size={15} /> All Trails
                        </button>
                        <button className={pendingFilters.showSavedOnly ? styles['finder-tab-active'] : ''} onClick={() => chooseSavedView(true)}>
                            <Heart size={15} fill={pendingFilters.showSavedOnly ? 'currentColor' : 'none'} /> Saved
                        </button>
                    </div>

                    {/* Results section — prominent, immediately visible */}
                    <div className={styles['finder-results-heading']}>
                        <h2>{results.length} Trails Found</h2>
                        <button onClick={() => chooseSavedView(true)} title="Show saved trails" aria-label="Show saved trails"><Heart size={17} /></button>
                    </div>

                    <div className={styles['finder-results']}>
                        {results.length === 0 && !loading && (
                            <div className={styles['finder-empty']}>
                                <MapPin size={16} />
                                <span>No trails available based on this place and current filters. Try adjusting the radius, difficulty, or search a different location.</span>
                            </div>
                        )}
                        {loading && (
                            <div className={styles['loading-container']}>
                                <div className={styles['mountain-loader']}>
                                    <svg viewBox="0 0 100 100">
                                        <path className={styles['mountain-path']} d="M10 80 L35 30 L50 55 L70 20 L90 80 Z" />
                                    </svg>
                                    <div className={styles['scanner-line']} />
                                </div>
                                <div className={styles['loading-text']}>Mapping Trails</div>
                                <div className={styles['loader-subtext']}>
                                    Scanning terrain data for the best hiking routes...
                                </div>
                            </div>
                        )}
                        {results.map((r) => {
                            const name = generateTrekName(r.tags, r.difficulty, r.length);
                            const saved = isSaved(r.id);
                            return (
                                <TrekCard
                                    key={r.id}
                                    trek={r}
                                    name={name}
                                    isSaved={saved}
                                    onSave={(e) => { e.stopPropagation(); void toggleSaveTrekSupabase(r); }}
                                    onViewRoute={() => viewRoute(r)}
                                />
                            );
                        })}
                    </div>

                    {/* Collapsible Filters section — below results */}
                    <section className={`${styles['finder-filters']} ${filtersExpanded ? '' : styles['finder-filters-collapsed']}`} aria-label="Trail filters">
                        <div className={styles['finder-filter-heading']} onClick={() => setFiltersExpanded(!filtersExpanded)} style={{ cursor: 'pointer' }}>
                            <Filter size={14} />
                            <h2>Filters</h2>
                            <div className={styles['finder-filter-summary']} aria-hidden="true">
                                <span>{pendingRadius} km</span>
                                <span>{pendingFilters.difficulty === 'all' ? 'All levels' : pendingFilters.difficulty}</span>
                                <span>{pendingFilters.duration === 'all' ? 'Any duration' : pendingFilters.duration}</span>
                            </div>
                            <button onClick={handleReset} style={{ cursor: 'pointer' }}>Reset <RotateCcw size={13} /></button>
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#2bff88' }}>{filtersExpanded ? '▴' : '▾'}</span>
                        </div>
                        {filtersExpanded && (
                            <>
                                <div className={styles['finder-range-label']}>
                                    <label htmlFor="finder-radius">Distance</label>
                                    <span>≤ {pendingRadius} km</span>
                                </div>
                                <input id="finder-radius" className={styles['finder-range']} type="range" min={10} max={150} step={5} value={pendingRadius} onChange={(event) => setPendingRadius(Number(event.target.value))} disabled={loading} />
                                <div className={styles['finder-range-limits']}><span>10 km</span><span>150+ km</span></div>

                                <div className={styles['finder-control-block']}>
                                    <label>Difficulty</label>
                                    <div className={styles['finder-difficulty']} role="group" aria-label="Difficulty">
                                        {['all', 'Easy', 'Moderate', 'Hard'].map((difficulty) => (
                                            <button key={difficulty} className={pendingFilters.difficulty === difficulty ? styles['finder-difficulty-active'] : ''} onClick={() => setPendingFilters({ ...pendingFilters, difficulty })}>{difficulty === 'all' ? 'All' : difficulty}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles['finder-select-row']}>
                                    <label htmlFor="finder-duration"><Clock size={14} /> Duration</label>
                                    <select id="finder-duration" value={pendingFilters.duration} onChange={(event) => setPendingFilters({ ...pendingFilters, duration: event.target.value })}>
                                        <option value="all">Any Duration</option>
                                        <option value="short">Up to 3 hours</option>
                                        <option value="medium">3 to 8 hours</option>
                                        <option value="long">Over 8 hours</option>
                                    </select>
                                </div>

                                <div className={styles['finder-select-row']}>
                                    <label htmlFor="finder-sort"><SlidersHorizontal size={14} /> Sort By</label>
                                    <select id="finder-sort" value={pendingFilters.sortBy} onChange={(event) => setPendingFilters({ ...pendingFilters, sortBy: event.target.value })}>
                                        <option value="distance">Distance (Near to Far)</option>
                                        <option value="difficulty">Difficulty</option>
                                    </select>
                                </div>

                                <button
                                    className={styles['finder-apply']}
                                    onClick={() => { setFilters(pendingFilters); setRadius(pendingRadius); }}
                                    disabled={loading || (
                                        pendingFilters.difficulty === filters.difficulty &&
                                        pendingFilters.duration === filters.duration &&
                                        pendingFilters.sortBy === filters.sortBy &&
                                        pendingFilters.showSavedOnly === filters.showSavedOnly &&
                                        pendingRadius === radius
                                    )}
                                >
                                    <SlidersHorizontal size={16} /> Apply Filters
                                </button>
                            </>
                        )}
                    </section>
                </aside>
            </main>
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
