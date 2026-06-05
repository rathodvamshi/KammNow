/**
 * geocoding.ts
 * Location utilities for KaamNow.
 *
 * Reverse geocoding priority:
 *   1. Google Maps Geocoding API (most accurate, uses your API key)
 *   2. expo-location reverseGeocodeAsync (device OS geocoder)
 *   3. Nominatim OpenStreetMap (no key, no rate-limit guarantee)
 *
 * All functions return a consistent GeocodedAddress shape.
 * No hardcoded city/area fallbacks — returns empty strings on failure.
 */

import * as ExpoLocation from 'expo-location';
import * as Sentry from '@sentry/react-native';
import type { SavedAddress } from '../store/addressStore';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface GeocodedAddress {
  flatHouse: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  formattedLine1: string;   // e.g. "42, MG Road"
  formattedLine2: string;   // e.g. "Begumpet, Hyderabad 500016"
  fullAddress: string;
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'place' | 'area' | 'street' | 'pincode';
}

// ─── Empty result (used when all strategies fail) ────────────────────────────
const emptyResult = (): GeocodedAddress => ({
  flatHouse: '',
  street: '',
  area: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  formattedLine1: '',
  formattedLine2: '',
  fullAddress: '',
});

// ─── Strategy 1: Google Maps Geocoding API ──────────────────────────────────
async function googleReverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  if (!GOOGLE_API_KEY) throw new Error('No Google API key');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en&region=IN`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Geocode HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Google Geocode status: ${data.status}`);
  }

  const result = data.results[0];
  const components: Record<string, string> = {};

  for (const comp of result.address_components) {
    for (const type of comp.types) {
      components[type] = comp.long_name;
      // Keep short_name for certain types
      if (type === 'administrative_area_level_1') {
        components['state_short'] = comp.short_name;
      }
    }
  }

  const flatHouse = components['street_number'] || '';
  const street = components['route'] || components['establishment'] || '';
  const area =
    components['sublocality_level_1'] ||
    components['sublocality'] ||
    components['neighborhood'] ||
    components['locality'] ||
    '';
  const landmark =
    components['point_of_interest'] ||
    components['establishment'] ||
    '';
  const city =
    components['locality'] ||
    components['administrative_area_level_2'] ||
    '';
  const state =
    components['administrative_area_level_1'] ||
    components['state_short'] ||
    '';
  const pincode = components['postal_code'] || '';

  const formattedLine1 = [flatHouse, street].filter(Boolean).join(', ');
  const formattedLine2 = [area, city, pincode].filter(Boolean).join(', ');
  const fullAddress = result.formatted_address || [formattedLine1, formattedLine2, state].filter(Boolean).join(', ');

  return { flatHouse, street, area, landmark, city, state, pincode, formattedLine1, formattedLine2, fullAddress };
}

// ─── Strategy 2: expo-location (device OS geocoder) ─────────────────────────
async function expoReverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const results = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  if (!results?.length) throw new Error('Expo geocode: no results');

  const r = results[0];
  const flatHouse = r.streetNumber || r.name || '';
  const street = r.street || r.district || '';
  const area = r.subregion || r.district || r.neighborhood || '';
  const landmark = r.name || '';
  const city = r.city || r.region || '';
  const state = r.region || '';
  const pincode = r.postalCode || '';

  const formattedLine1 = [flatHouse, street].filter(Boolean).join(', ');
  const formattedLine2 = [area, city, pincode].filter(Boolean).join(', ');
  const fullAddress = [formattedLine1, formattedLine2, state].filter(Boolean).join(', ');

  if (!city && !area) throw new Error('Expo geocode: insufficient detail');

  return { flatHouse, street, area, landmark, city, state, pincode, formattedLine1, formattedLine2, fullAddress };
}

// ─── Strategy 3: OpenStreetMap Nominatim ────────────────────────────────────
async function nominatimReverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KaamNow/1.0 (contact@kaamnow.com)' },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(`Nominatim: ${data.error}`);

  const a = data.address || {};
  const flatHouse = a.house_number || '';
  const street = a.road || a.pedestrian || a.footway || '';
  const area = a.neighbourhood || a.suburb || a.county || a.subdistrict || '';
  const landmark = a.amenity || a.building || a.shop || '';
  const city = a.city || a.town || a.village || a.municipality || '';
  const state = a.state || '';
  const pincode = a.postcode || '';

  const formattedLine1 = [flatHouse, street].filter(Boolean).join(', ');
  const formattedLine2 = [area, city, pincode].filter(Boolean).join(', ');
  const fullAddress = data.display_name || [formattedLine1, formattedLine2].join(', ');

  return { flatHouse, street, area, landmark, city, state, pincode, formattedLine1, formattedLine2, fullAddress };
}

// ─── Public: reverseGeocode — tries all strategies in order ─────────────────
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  // Strategy 1: Google API (most accurate, structured)
  if (GOOGLE_API_KEY) {
    try {
      return await googleReverseGeocode(lat, lng);
    } catch (err) {
      Sentry.captureMessage(`[Geocoding] Google failed: ${err}`);
    }
  }

  // Strategy 2: expo-location device OS geocoder
  try {
    return await expoReverseGeocode(lat, lng);
  } catch (err) {
    Sentry.captureMessage(`[Geocoding] Expo failed: ${err}`);
  }

  // Strategy 3: Nominatim OSM fallback
  try {
    return await nominatimReverseGeocode(lat, lng);
  } catch (err) {
    Sentry.captureMessage(`[Geocoding] Nominatim failed: ${err}`);
  }

  // All strategies failed — return empty (no hardcoded city)
  return emptyResult();
}

// ─── Public: searchLocations — Google Places + OSM fallback ─────────────────
export async function searchLocations(
  query: string,
  nearLat?: number,
  nearLng?: number
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  // Strategy 1: Google Places Autocomplete
  if (GOOGLE_API_KEY) {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=en&components=country:in&types=geocode`;
      if (nearLat && nearLng) {
        url += `&location=${nearLat},${nearLng}&radius=50000`;
      }
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.predictions?.length) {
        // We need coordinates — fetch place details for top 5 predictions
        const results = await Promise.all(
          data.predictions.slice(0, 5).map(async (pred: any) => {
            try {
              const detailRes = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry,formatted_address,name&key=${GOOGLE_API_KEY}`
              );
              const detail = await detailRes.json();
              if (detail.status !== 'OK') return null;
              const loc = detail.result.geometry?.location;
              if (!loc) return null;
              return {
                id: pred.place_id,
                name: pred.structured_formatting?.main_text || pred.description.split(',')[0],
                address: pred.structured_formatting?.secondary_text || pred.description,
                lat: loc.lat,
                lng: loc.lng,
                type: 'place' as const,
              };
            } catch {
              return null;
            }
          })
        );
        const valid = results.filter(Boolean) as SearchResult[];
        if (valid.length > 0) return valid;
      }
    } catch (err) {
      Sentry.captureMessage(`[Geocoding] Google Places search failed: ${err}`);
    }
  }

  // Strategy 2: Nominatim OSM search fallback
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=in`;
    if (nearLat && nearLng) {
      url += `&viewbox=${nearLng - 0.5},${nearLat + 0.5},${nearLng + 0.5},${nearLat - 0.5}&bounded=0`;
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'KaamNow/1.0 (contact@kaamnow.com)' },
    });
    const data = await res.json();

    return data.map((item: any): SearchResult => {
      const a = item.address || {};
      const name = a.road || a.suburb || a.city || item.display_name.split(',')[0];
      const shortAddr = [
        a.neighbourhood || a.suburb,
        a.city || a.town,
        a.state,
      ].filter(Boolean).join(', ');

      return {
        id: item.place_id?.toString() || `osm_${Math.random()}`,
        name,
        address: shortAddr || item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type === 'postcode' ? 'pincode' : 'place',
      };
    });
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAddressDisplayLabel(addr: SavedAddress): string {
  return [addr.flatHouse, addr.area, addr.city].filter(Boolean).join(', ');
}

export function formatSavedAddress(addr: SavedAddress): string {
  return [
    addr.flatHouse,
    addr.floor ? `Floor ${addr.floor}` : '',
    addr.street,
    addr.landmark ? `Near ${addr.landmark}` : '',
    addr.area,
    addr.city,
    addr.state,
    addr.pincode,
  ].filter(Boolean).join(', ');
}
