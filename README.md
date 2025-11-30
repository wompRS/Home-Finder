# Home Finder

Containerized MVP scaffold for a modern real estate search app with AI vision enrichment.

## Current status
- **Scraping is currently inoperable**: Zillow/Redfin/Realtor block the included scraper (even with VPN/SOCKS). The app falls back to demo data until proper data access (licensed feed or working residential HTTP/HTTPS proxies) is provided.
- Keep credentials in `.env` locally; do not commit them.

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

## Scraper service (personal use)
- A lightweight Playwright-based scraper is included at `scraper/` and runs as `scraper` in docker-compose (exposed on :3001).
- Set `SCRAPER_TOKEN` to protect it. The API is pre-wired to call `http://scraper:3001/search`.
- It targets Zillow cards by default and falls back to a demo result if nothing is scraped. Selectors may need updates over time (see `scraper/server.js`).
