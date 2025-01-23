"use client";
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type MapProps = {
    onLocationSelect: (lat: number, lng: number) => void;
    initialLocation?: {
        latitude: number;
        longitude: number;
    };
}

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    const map = useMapEvents({
        click: (e) => {
            const { lat, lng } = e.latlng;
            onLocationSelect(lat, lng);

            // Clear existing markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Add new marker
            L.marker([lat, lng], { icon }).addTo(map);
        },
    });
    return null;
}

function UpdateMapCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function Map({ onLocationSelect, initialLocation }: MapProps) {
    const mapRef = useRef<L.Map>(null);
    const defaultCenter: [number, number] = [40.7128, -74.0060]; // New York City
    const center: [number, number] = initialLocation
        ? [initialLocation.latitude, initialLocation.longitude]
        : defaultCenter;

    useEffect(() => {
        if (mapRef.current && initialLocation) {
            const { latitude, longitude } = initialLocation;
            // Clear existing markers
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    mapRef.current?.removeLayer(layer);
                }
            });
            // Add marker for initial location
            L.marker([latitude, longitude], { icon }).addTo(mapRef.current);
        }
    }, [initialLocation]);

    return (
        <MapContainer
            ref={mapRef}
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onLocationSelect={onLocationSelect} />
            <UpdateMapCenter center={center} />
        </MapContainer>
    );
}
