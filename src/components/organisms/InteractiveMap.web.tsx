import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface InteractiveMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChange?: () => void;
  onRegionChangeComplete?: (region: any) => void;
  mapPadding?: { top: number; right: number; bottom: number; left: number };
  scrollEnabled?: boolean;
}

export const InteractiveMap = forwardRef<any, InteractiveMapProps>(
  ({ region, onRegionChange, onRegionChangeComplete, mapPadding, scrollEnabled = true }, ref) => {
    // Stable unique ID per component instance — prevents collision when multiple maps mount
    const containerIdRef = useRef(`web-leaflet-map-${Math.random().toString(36).slice(2, 9)}`);
    const containerId = containerIdRef.current;
    const mapInstance = useRef<any>(null);

    // Expose animateToRegion to parent
    useImperativeHandle(ref, () => ({
      animateToRegion: (newRegion: any, duration: number = 600) => {
        if (mapInstance.current) {
          mapInstance.current.flyTo(
            [newRegion.latitude, newRegion.longitude],
            16,
            { animate: true, duration: duration / 1000 }
          );
        }
      },
    }));

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
          delete (mapContainer as any)._leaflet_id;
        }

        const map = L.map(containerId, {
          zoomControl: false,
          attributionControl: false,
          dragging: scrollEnabled,
          scrollWheelZoom: scrollEnabled,
          touchZoom: scrollEnabled,
        }).setView([region.latitude, region.longitude], 16);

        // CartoDB Voyager — premium, clean, Google Maps-like tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
        }).addTo(map);

        // Track panning to trigger parent callbacks
        map.on('movestart', () => {
          if (onRegionChange) onRegionChange();
        });

        map.on('moveend', () => {
          const center = map.getCenter();
          if (onRegionChangeComplete) {
            onRegionChangeComplete({
              latitude: center.lat,
              longitude: center.lng,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            });
          }
        });

        mapInstance.current = map;
      };

      // Load Leaflet CSS and JS if not already available
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
    }, []);

    // Update map view if parent updates coordinates
    useEffect(() => {
      if (mapInstance.current) {
        const center = mapInstance.current.getCenter();
        const dist = Math.abs(center.lat - region.latitude) + Math.abs(center.lng - region.longitude);
        if (dist > 0.0001) {
          mapInstance.current.flyTo([region.latitude, region.longitude], 16, {
            animate: true,
            duration: 0.6,
          });
        }
      }
    }, [region.latitude, region.longitude]);

    return (
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <div id={containerId} style={{ width: '100%', height: '100%', position: 'absolute' }} />
        ) : null}
      </View>
    );
  }
);
