import type { PageLoad } from './$types';

export type Listing = {
  id: string;
  title: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  propertyType: string;
  photoUrl: string;
  tags: string[];
  source: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch(`${API_BASE}/search`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { listings: data.results ?? [] };
  } catch (err) {
    console.error('Failed to load listings', err);
    return { listings: [] };
  }
};
