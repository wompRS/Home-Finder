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
- `LISTINGS_API_BASE` (optional; official/partner listings API base URL)
- `LISTINGS_API_KEY` (optional; bearer token for the official listings API)
- `SCRAPER_LISTINGS_BASE` (optional; unofficial scraper/proxy for Zillow/Redfin-style data you self-host)
- `SCRAPER_LISTINGS_KEY` (optional; bearer token for the scraper proxy)
  - Precedence: if `SCRAPER_LISTINGS_BASE` is set, the API uses it; otherwise it uses `LISTINGS_API_BASE`; otherwise it falls back to in-memory demo listings.

## Next steps
- Point `SCRAPER_LISTINGS_BASE` to your self-hosted Zillow/Redfin scraper proxy (for personal use) or `LISTINGS_API_BASE` to a partner/MLS feed.
- Implement ingest + enrichment jobs using the vision API.
- Harden search params and filters, connect UI filters to API queries.
