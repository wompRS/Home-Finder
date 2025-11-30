# Home Finder

Containerized MVP scaffold for a modern real estate search app with AI vision enrichment.

## Stack
- Frontend: SvelteKit + Tailwind (charcoal + mint theme)
- API: Go (chi)
- DB: Postgres (can swap to SQLite later)
- Vision: external provider (e.g., GPT-4o Mini Vision), stubbed via env

## Quick start (Docker)
1) Ensure Docker is available.
2) Build and run:
```
docker compose up --build
```
Frontend: http://localhost:4173  
API: http://localhost:8080/health

## Env vars
- `VISION_API_KEY` (optional for future vision client)
- `DATABASE_URL` (defaults via compose to Postgres)
- `VITE_API_BASE` (frontend ? API URL; set in compose)
- `LISTINGS_API_BASE` (optional; external listings API base URL, e.g., https://api.your-provider.com)
- `LISTINGS_API_KEY` (optional; bearer token for the external listings API)
  - If `LISTINGS_API_BASE` is unset, the API will fall back to in-memory demo listings.

## Next steps
- Connect to a real listing provider (MLS/aggregator) via `LISTINGS_API_BASE`.
- Implement ingest + enrichment jobs using the vision API.
- Harden search params and filters, connect UI filters to API queries.
