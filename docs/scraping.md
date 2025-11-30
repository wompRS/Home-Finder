# Unofficial scraping (Zillow/Redfin) - personal use only

**Disclaimer:** Scraping consumer sites can violate Terms of Service and may break without notice. Use only for personal tinkering, not for production or redistribution. Prefer official MLS/partner feeds when possible.

## How to plug in a scraper proxy
1. Run or provision a scraper/proxy that exposes a simple `GET /search` endpoint returning:
   ```json
   { "results": [ { ...listing fields... } ] }
   ```
   Expected fields align with `internal/types/listing.go`.
2. Set env vars:
   - `SCRAPER_LISTINGS_BASE` = `https://your-scraper.example.com`
   - `SCRAPER_LISTINGS_KEY` (optional) = bearer token if your scraper is protected
3. Start the stack:
   ```bash
   docker compose up --build
   ```
4. The API will hit your scraper first. If unset or it fails, the API falls back to demo listings.

## Upstream query params we send
The API forwards the same filters you see in the UI: `min_price`, `max_price`, `min_beds`, `max_beds`, `min_baths`, `max_baths`, `min_sqft`, `max_sqft`, `min_lot_sqft`, `max_lot_sqft`, `min_year_built`, `max_year_built`, `min_stories`, `min_garage`, `min_hoa`, `max_hoa`, `property_types`, `tags`, `exclude_tags`, `city`, `state`, `zip`, `q`, `use_vision`, `pool`, `waterfront`, `view`, `basement`, `fireplace`, `adu`, `rv_parking`, `new_build`, `fixer`.

## Tips
- Keep your scraper behind a key and rate-limit to avoid getting blocked.
- Cache results where possible; many filters can be applied locally after fetching.
- Expect occasional breakage; keep the demo data as a fallback.
