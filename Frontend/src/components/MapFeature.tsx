'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapFeatureProps {
    center: [number, number];
    zoom: number;
    markers: Array<{ coords: [number, number]; title?: string }>;
    polylines: Array<{
        coords: [number, number][];
        color: string;
        weight?: number;
        opacity?: number;
        dashArray?: string;
        popup?: string;
        lineCap?: 'butt' | 'round' | 'square' | 'inherit';
    }>;
    circleMarkers?: Array<{
        coords: [number, number];
        color: string;
        fillColor?: string;
        radius: number;
        weight?: number;
        opacity?: number;
        fillOpacity?: number;
        popup?: string;
    }>;
    onMapClick: (lat: number, lng: number) => void;
    fitBounds?: [number, number][];
}

const MapFeature: React.FC<MapFeatureProps> = ({ center, zoom, markers, polylines, circleMarkers, onMapClick, fitBounds }) => {
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const layersRef = useRef<L.Layer[]>([]);

    // Initialize Map
    useEffect(() => {
        if (mapRef.current) return;

        const INDIA_BBOX = { south: 6.746778, west: 68.1097, north: 35.674545, east: 97.39556 };
        const initialCenter: [number, number] = [22.5937, 78.9629];

        const map = L.map('trek-map', {
            zoomControl: true,
            minZoom: 5,
            maxZoom: 18,
            maxBounds: [
                [INDIA_BBOX.south, INDIA_BBOX.west],
                [INDIA_BBOX.north, INDIA_BBOX.east],
            ],
            maxBoundsViscosity: 1.0,
            dragging: true,
        }).setView(initialCenter, 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            onMapClick(lat, lng);
        });

        const handleResize = () => map.invalidateSize({ pan: false });
        window.addEventListener('resize', handleResize);

        mapRef.current = map;

        return () => {
            window.removeEventListener('resize', handleResize);
            map.remove();
            mapRef.current = null;
        };
    }, []); // Run once on mount

    // Update View (Center/Zoom)
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.setView(center, zoom);
        }
    }, [center, zoom]);

    // Update Markers
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove existing markers
        markersRef.current.forEach(m => m.removeFrom(mapRef.current!));
        markersRef.current = [];

        // Add new markers
        markers.forEach(m => {
            const marker = L.marker(m.coords).addTo(mapRef.current!);
            if (m.title) marker.bindPopup(m.title);
            markersRef.current.push(marker);
        });
    }, [markers]);

    // Update Polylines & CircleMarkers (Layers)
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove existing layers (polylines + circle markers)
        layersRef.current.forEach(l => l.removeFrom(mapRef.current!));
        layersRef.current = [];

        // Add Polylines
        polylines.forEach(p => {
            const poly = L.polyline(p.coords, {
                color: p.color,
                weight: p.weight || 3,
                opacity: p.opacity || 0.85,
                dashArray: p.dashArray,
                lineCap: p.lineCap || 'round'
            }).addTo(mapRef.current!);
            if (p.popup) poly.bindPopup(p.popup);
            layersRef.current.push(poly);
        });

        // Add CircleMarkers
        if (circleMarkers) {
            circleMarkers.forEach(c => {
                const marker = L.circleMarker(c.coords, {
                    radius: c.radius,
                    fillColor: c.fillColor || c.color,
                    color: c.color,
                    weight: c.weight || 2,
                    opacity: c.opacity || 1,
                    fillOpacity: c.fillOpacity || 0.95
                }).addTo(mapRef.current!);
                if (c.popup) marker.bindPopup(c.popup);
                layersRef.current.push(marker);
            });
        }
    }, [polylines, circleMarkers]);

    // Update Fit Bounds (for View Route)
    useEffect(() => {
        if (mapRef.current && fitBounds && fitBounds.length > 0) {
            mapRef.current.fitBounds(fitBounds, { padding: [50, 50] });
        }
    }, [fitBounds]);

    return <div id="trek-map" style={{ width: '100%', height: '100%', zIndex: 1 }} />;
};

export default MapFeature;
