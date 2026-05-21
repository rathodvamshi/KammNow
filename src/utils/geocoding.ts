import * as ExpoLocation from 'expo-location';
import type { SavedAddress } from '../store/addressStore';

export interface GeocodedAddress {
  flatHouse: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  formattedLine1: string;
  formattedLine2: string;
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

/**
 * Reverse geocode coordinates → structured address using expo-location
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  try {
    const results = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!results || results.length === 0) throw new Error('No results');

    const r = results[0];
    const flatHouse = r.name || '';
    const street = r.street || r.district || 'Street name';
    const area = r.subregion || r.district || 'Somajiguda';
    const landmark = r.subregion || 'Near KPHB Metro';
    const city = r.city || r.region || 'Hyderabad';
    const state = r.region || 'Telangana';
    const pincode = r.postalCode || '500016';

    const formattedLine1 = [flatHouse, street].filter(Boolean).join(', ');
    const formattedLine2 = [area, city, pincode].filter(Boolean).join(', ');
    const fullAddress = [formattedLine1, formattedLine2, state].filter(Boolean).join(', ');

    return { flatHouse, street, area, landmark, city, state, pincode, formattedLine1, formattedLine2, fullAddress };
  } catch (e) {
    // Fallback to Nominatim OpenStreetMap (no API key needed)
    return nominatimReverseGeocode(lat, lng);
  }
}

/**
 * Fallback: OpenStreetMap Nominatim reverse geocode
 */
async function nominatimReverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KaamNow/1.0 (contact@kaamnow.com)' },
    });
    const data = await res.json();
    const a = data.address || {};

    const flatHouse = a.house_number ? `${a.house_number}` : '';
    const street = a.road || a.pedestrian || 'Street name';
    const area = a.neighbourhood || a.suburb || a.subdistrict || a.county || 'Somajiguda';
    const city = a.city || a.town || a.village || 'Hyderabad';
    const state = a.state || 'Telangana';
    const pincode = a.postcode || '500016';
    const landmark = a.amenity || a.building || 'Near KPHB Metro';

    const formattedLine1 = [flatHouse, street].filter(Boolean).join(', ');
    const formattedLine2 = [area, city, pincode].filter(Boolean).join(', ');
    const fullAddress = data.display_name || [formattedLine1, formattedLine2].join(', ');

    return { flatHouse, street, area, landmark, city, state, pincode, formattedLine1, formattedLine2, fullAddress };
  } catch {
    return {
      flatHouse: '',
      street: 'Street name',
      area: 'Somajiguda',
      landmark: 'Near KPHB Metro',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500016',
      formattedLine1: 'Street name, Somajiguda',
      formattedLine2: 'Hyderabad, Telangana - 500016',
      fullAddress: 'Street name, Somajiguda, Near KPHB Metro, Hyderabad, Telangana - 500016',
    };
  }
}

/**
 * Search locations using OpenStreetMap Nominatim autocomplete
 */
export async function searchLocations(query: string, nearLat?: number, nearLng?: number): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

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
        id: item.place_id?.toString() || Math.random().toString(),
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

/**
 * Get display label for address
 */
export function getAddressDisplayLabel(addr: SavedAddress): string {
  return [addr.flatHouse, addr.area, addr.city].filter(Boolean).join(', ');
}

/**
 * Format a full readable address from a SavedAddress
 */
export function formatSavedAddress(addr: SavedAddress): string {
  return [
    addr.flatHouse,
    addr.street,
    addr.landmark ? `Near ${addr.landmark}` : '',
    addr.area,
    addr.city,
    addr.state,
    addr.pincode,
  ].filter(Boolean).join(', ');
}
