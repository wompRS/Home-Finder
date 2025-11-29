const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export async function load({ fetch }) {
  try {
    const res = await fetch(`${API_BASE}/search`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { listings: data.results ?? [] };
  } catch (err) {
    console.error('Failed to load listings', err);
    return { listings: [] };
  }
}