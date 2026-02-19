'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface MapFeatureProps {
    center: [number, number]; // [lat, lng]
    zoom: number;
    markers: Array<{ coords: [number, number]; title?: string }>;
    polylines: Array<{
        coords: [number, number][];
        color: string;
        weight?: number;
        opacity?: number;
        dashArray?: string;
        popup?: string;
        lineCap?: 'butt' | 'round' | 'square';
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
    pitch?: number;
}

const MapFeature: React.FC<MapFeatureProps> = ({ center, zoom, markers, polylines, circleMarkers, onMapClick, fitBounds, pitch = 0 }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    const toLngLat = (coords: [number, number]): [number, number] => [coords[1], coords[0]];

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
            center: [73.7898, 19.9975],
            zoom: zoom || 14,
            pitch: pitch,
            bearing: 0,
            antialias: true,
            minZoom: 2,
            maxZoom: 20,
            trackResize: true,
            fadeDuration: 0,
        } as any);

        map.on('style.load', () => {
            map.addSource('maptiler-terrain', {
                type: 'raster-dem',
                url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
                tileSize: 512
            });
            map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });
        });

        map.on('load', () => {
            // Pre-create Sources for faster 'setData' updates
            map.addSource('polyline-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            map.addSource('circle-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            // Add Polyline Layer
            map.addLayer({
                id: 'polylines-layer',
                type: 'line',
                source: 'polyline-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                    'line-opacity': ['get', 'opacity']
                }
            });

            // Add Circle Layer
            map.addLayer({
                id: 'circles-layer',
                type: 'circle',
                source: 'circle-source',
                paint: {
                    'circle-radius': ['get', 'radius'],
                    'circle-color': ['get', 'fillColor'],
                    'circle-stroke-color': ['get', 'color'],
                    'circle-stroke-width': ['get', 'weight'],
                    'circle-opacity': ['get', 'fillOpacity'],
                    'circle-stroke-opacity': ['get', 'opacity']
                }
            });

            if (map.getSource('openmaptiles')) {
                map.addLayer({
                    'id': '3d-buildings',
                    'source': 'openmaptiles',
                    'source-layer': 'building',
                    'type': 'fill-extrusion',
                    'minzoom': 14,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': ['get', 'render_height'],
                        'fill-extrusion-base': ['get', 'render_min_height'],
                        'fill-extrusion-opacity': 0.6
                    }
                });
            }
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('click', (e) => {
            onMapClick(e.lngLat.lat, e.lngLat.lng);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Explicit Pitch and Bearing selection (Strictly manual)
    useEffect(() => {
        if (mapRef.current) {
            const currentPitch = mapRef.current.getPitch();
            if (Math.abs(currentPitch - pitch) > 0.1) {
                mapRef.current.easeTo({
                    pitch: pitch,
                    bearing: 0,
                    duration: 800,
                    easing: (t) => t * (2 - t)
                });
            }
        }
    }, [pitch]);

    // Update View
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.jumpTo({
                center: toLngLat(center),
                zoom: zoom
            });
        }
    }, [center, zoom]);

    // Optimized Markers
    useEffect(() => {
        if (!mapRef.current) return;
        markersRef.current.forEach(m => m.remove());
        markersRef.current = markers.map(m => {
            const marker = new maplibregl.Marker()
                .setLngLat(toLngLat(m.coords))
                .addTo(mapRef.current!);
            if (m.title) {
                marker.setPopup(new maplibregl.Popup({ offset: 25 }).setText(m.title));
            }
            return marker;
        });
    }, [markers]);

    // Fast Data Updates using setData
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const polySource = map.getSource('polyline-source') as maplibregl.GeoJSONSource;
        if (polySource) {
            polySource.setData({
                type: 'FeatureCollection',
                features: polylines.map((p) => ({
                    type: 'Feature',
                    properties: {
                        color: p.color,
                        weight: p.weight || 3,
                        opacity: p.opacity || 0.85,
                        popup: p.popup
                    },
                    geometry: { type: 'LineString', coordinates: p.coords.map(c => toLngLat(c)) }
                }))
            });
        }

        const circleSource = map.getSource('circle-source') as maplibregl.GeoJSONSource;
        if (circleSource && circleMarkers) {
            circleSource.setData({
                type: 'FeatureCollection',
                features: circleMarkers.map((c) => ({
                    type: 'Feature',
                    properties: {
                        radius: c.radius,
                        color: c.color,
                        fillColor: c.fillColor || c.color,
                        weight: c.weight || 2,
                        opacity: c.opacity || 1,
                        fillOpacity: c.fillOpacity || 0.95,
                        popup: c.popup
                    },
                    geometry: { type: 'Point', coordinates: toLngLat(c.coords) }
                }))
            });
        }
    }, [polylines, circleMarkers]);

    useEffect(() => {
        if (mapRef.current && fitBounds && fitBounds.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            fitBounds.forEach(coord => bounds.extend(toLngLat(coord)));
            requestAnimationFrame(() => {
                if (mapRef.current) {
                    mapRef.current.fitBounds(bounds, {
                        padding: 50,
                        duration: 1000,
                        pitch: mapRef.current.getPitch(),
                        bearing: mapRef.current.getBearing()
                    });
                }
            });
        }
    }, [fitBounds]);

    return <div ref={mapContainerRef} id="trek-map" style={{ width: '100%', height: '100%', zIndex: 1 }} />;
};

const propsAreEqual = (prev: MapFeatureProps, next: MapFeatureProps) => {
    return (
        prev.pitch === next.pitch &&
        prev.center[0] === next.center[0] &&
        prev.center[1] === next.center[1] &&
        prev.zoom === next.zoom &&
        prev.markers?.length === next.markers?.length &&
        prev.polylines?.length === next.polylines?.length &&
        prev.circleMarkers?.length === next.circleMarkers?.length &&
        prev.fitBounds?.length === next.fitBounds?.length
    );
};

export default React.memo(MapFeature, propsAreEqual);




