import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface StaticMapProps {
  latitude: number;
  longitude: number;
}

export const StaticMap: React.FC<StaticMapProps> = ({ latitude, longitude }) => {
  // Stable ID per component instance — never regenerated on re-render
  const containerIdRef = useRef(`web-leaflet-static-${Math.random().toString(36).slice(2, 9)}`);
  const containerId = containerIdRef.current;
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let isMounted = true;

    const initLeaflet = () => {
      const L = (window as any).L;
      if (!L) return;

      const mapContainer = document.getElementById(containerId);
      if (!mapContainer) return;

      // If Leaflet already owns this container, remove it first
      if ((mapContainer as any)._leaflet_id) {
        try {
          mapInstance.current?.remove();
        } catch (e) {}
        mapInstance.current = null;
        // Reset the flag so Leaflet allows re-init
        delete (mapContainer as any)._leaflet_id;
      }

      const map = L.map(containerId, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      }).setView([latitude, longitude], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.marker([latitude, longitude]).addTo(map);

      mapInstance.current = map;
    };

    if (!(window as any).L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          if (isMounted) initLeaflet();
        };
        document.head.appendChild(script);
      } else {
        // Script tag exists but may still be loading
        const existing = document.getElementById('leaflet-js') as HTMLScriptElement;
        if ((window as any).L) {
          initLeaflet();
        } else {
          existing.addEventListener('load', () => { if (isMounted) initLeaflet(); });
        }
      }
    } else {
      initLeaflet();
    }

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {Platform.OS === 'web' ? (
        <div id={containerId} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      ) : null}
    </View>
  );
};

