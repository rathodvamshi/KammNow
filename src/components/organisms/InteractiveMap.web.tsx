import React, { forwardRef, useEffect, useRef } from 'react';
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
}

export const InteractiveMap = forwardRef<any, InteractiveMapProps>(
  ({ region, onRegionChange, onRegionChangeComplete }, ref) => {
    const containerId = 'web-leaflet-map';
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
          delete (mapContainer as any)._leaflet_id;
        }

        const map = L.map(containerId, {
          zoomControl: false,
          attributionControl: false,
        }).setView([region.latitude, region.longitude], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Track panning to trigger parent callbacks
        map.on('movestart', () => {
          if (onRegionChange) onRegionChange();
        });

        map.on('move', () => {
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
          mapInstance.current.setView([region.latitude, region.longitude], 15);
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

