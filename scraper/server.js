import express from 'express';
import { chromium } from 'playwright';
import { LRUCache } from 'lru-cache';

const PORT = process.env.PORT || 3001;
const AUTH = process.env.SCRAPER_TOKEN || '';
const MAX_RESULTS = Number(process.env.SCRAPER_MAX_RESULTS || 40);
const HEADLESS = process.env.HEADLESS !== 'false';

const app = express();
const cache = new LRUCache({ max: 100, ttl: 5 * 60 * 1000 });

app.use(express.json());

// Simple bearer check for personal use.
app.use((req, res, next) => {
  if (AUTH) {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (token !== AUTH) return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/search', async (req, res) => {
  const key = req.url;
  if (cache.has(key)) return res.json({ results: cache.get(key), cached: true });

  const targetUrl = buildTargetUrl(req.query);
  if (!targetUrl) return res.status(400).json({ error: 'missing location (city/state or zip or q)' });

  try {
    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    await autoScroll(page, 2);
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 20000 }).catch(() => {});

    const results = await extractZillowCards(page, MAX_RESULTS);
    await browser.close();

    const finalResults = results.length ? results : demoFallback(req.query);
    cache.set(key, finalResults);
    res.json({ results: finalResults, source: results.length ? 'scraped' : 'fallback' });
  } catch (err) {
    console.error('scrape error', err);
    res.status(500).json({ error: 'scrape failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper listening on :${PORT}`);
});

function buildTargetUrl(q) {
  const city = (q.city || '').trim();
  const state = (q.state || '').trim();
  const zip = (q.zip || '').trim();
  const query = (q.q || '').trim();

  if (zip) return `https://www.zillow.com/homes/${encodeURIComponent(zip)}_rb/`;
  if (city && state) return `https://www.zillow.com/homes/${encodeURIComponent(city)}-${encodeURIComponent(state)}/`;
  if (query) return `https://www.zillow.com/homes/${encodeURIComponent(query)}/`;
  return '';
}

async function autoScroll(page, passes = 2) {
  for (let i = 0; i < passes; i++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(800);
  }
}

async function extractZillowCards(page, limit) {
  const cards = await page.$$eval('[data-testid=\"property-card\"]', (nodes, limitInner) => {
    const toNumber = (txt) => {
      if (!txt) return 0;
      const digits = txt.replace(/[^0-9.]/g, '');
      return Number(digits || 0);
    };
    const normalizeText = (el, sel) => (el.querySelector(sel)?.textContent || '').trim();

    return nodes.slice(0, limitInner).map((node) => {
      const priceText = normalizeText(node, '[data-testid=\"property-card-price\"]');
      const address = normalizeText(node, '[data-testid=\"property-card-addr\"]');
      const meta = Array.from(node.querySelectorAll('[data-testid=\"property-card-meta-item\"]')).map((n) =>
        n.textContent.trim()
      );
      const beds = meta.find((m) => m.toLowerCase().includes('bd'));
      const baths = meta.find((m) => m.toLowerCase().includes('ba'));
      const sqft = meta.find((m) => m.toLowerCase().includes('sqft'));

      const link = node.querySelector('a[data-testid=\"property-card-link\"]')?.getAttribute('href') || '';
      const idMatch = link.match(/\/([0-9]+)_zpid/);

      const img =
        node.querySelector('img')?.getAttribute('src') ||
        node.querySelector('img')?.getAttribute('data-src') ||
        '';

      return {
        id: idMatch ? idMatch[1] : link || Math.random().toString(36).slice(2),
        title: normalizeText(node, '[data-testid=\"property-card-price\"]') || 'Listing',
        price: toNumber(priceText),
        address,
        city: '',
        state: '',
        zip: '',
        beds: beds ? toNumber(beds) : 0,
        baths: baths ? parseFloat((baths.match(/[0-9.]+/) || [0])[0]) : 0,
        sqft: sqft ? toNumber(sqft) : 0,
        lotSqft: 0,
        yearBuilt: 0,
        stories: 0,
        garageSpaces: 0,
        hasRvParking: false,
        hasPool: false,
        hasWaterfront: false,
        hasView: false,
        hasBasement: false,
        hasFireplace: false,
        isNewBuild: false,
        isFixer: false,
        hasAdu: false,
        hoaFee: 0,
        propertyType: '',
        photoUrl: img,
        tags: meta,
        visionTags: [],
        source: 'zillow-scraper',
      };
    });
  }, limit);

  // Attempt to backfill city/state/zip from address tokens.
  return cards.map((c) => {
    if (!c.address) return c;
    const parts = c.address.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1].split(' ').filter(Boolean);
      c.city = city;
      if (stateZip.length >= 1) c.state = stateZip[0];
      if (stateZip.length >= 2) c.zip = stateZip[1];
    }
    return c;
  });
}

function demoFallback(q) {
  const city = (q.city || '').trim() || 'Demo City';
  const state = (q.state || '').trim() || 'ST';
  return [
    {
      id: 'demo-scrape-1',
      title: 'Mint Craftsman with Porch',
      price: 725000,
      address: `123 Demo St, ${city}, ${state} 00000`,
      city,
      state,
      zip: '00000',
      beds: 3,
      baths: 2.5,
      sqft: 1850,
      lotSqft: 5200,
      yearBuilt: 1930,
      stories: 2,
      garageSpaces: 2,
      hasRvParking: true,
      hasPool: false,
      hasWaterfront: false,
      hasView: false,
      hasBasement: true,
      hasFireplace: true,
      isNewBuild: false,
      isFixer: false,
      hasAdu: true,
      hoaFee: 0,
      propertyType: 'Single Family',
      photoUrl: '',
      tags: ['front porch', 'rv parking', 'adu', 'garden'],
      visionTags: [],
      source: 'fallback',
    },
    {
      id: 'demo-scrape-2',
      title: 'Modern Loft with View',
      price: 540000,
      address: `456 Skyline Ave, ${city}, ${state} 00000`,
      city,
      state,
      zip: '00000',
      beds: 2,
      baths: 2,
      sqft: 1200,
      lotSqft: 0,
      yearBuilt: 2018,
      stories: 1,
      garageSpaces: 1,
      hasRvParking: false,
      hasPool: true,
      hasWaterfront: false,
      hasView: true,
      hasBasement: false,
      hasFireplace: true,
      isNewBuild: false,
      isFixer: false,
      hasAdu: false,
      hoaFee: 320,
      propertyType: 'Condo',
      photoUrl: '',
      tags: ['city view', 'balcony', 'pool'],
      visionTags: [],
      source: 'fallback',
    },
    {
      id: 'demo-scrape-3',
      title: 'Backyard Pool Bungalow',
      price: 615000,
      address: `789 Palm Dr, ${city}, ${state} 00000`,
      city,
      state,
      zip: '00000',
      beds: 3,
      baths: 2,
      sqft: 1500,
      lotSqft: 6000,
      yearBuilt: 1975,
      stories: 1,
      garageSpaces: 1,
      hasRvParking: false,
      hasPool: true,
      hasWaterfront: false,
      hasView: false,
      hasBasement: false,
      hasFireplace: false,
      isNewBuild: false,
      isFixer: false,
      hasAdu: false,
      hoaFee: 0,
      propertyType: 'Single Family',
      photoUrl: '',
      tags: ['pool', 'patio', 'fenced yard'],
      visionTags: [],
      source: 'fallback',
    },
    {
      id: 'demo-scrape-4',
      title: 'Townhome with Mountain Peek',
      price: 489000,
      address: `12 Ridge Ln, ${city}, ${state} 00000`,
      city,
      state,
      zip: '00000',
      beds: 3,
      baths: 2,
      sqft: 1500,
      lotSqft: 1800,
      yearBuilt: 2012,
      stories: 2,
      garageSpaces: 1,
      hasRvParking: false,
      hasPool: false,
      hasWaterfront: false,
      hasView: true,
      hasBasement: false,
      hasFireplace: false,
      isNewBuild: false,
      isFixer: false,
      hasAdu: false,
      hoaFee: 210,
      propertyType: 'Townhouse',
      photoUrl: '',
      tags: ['patio', 'attached garage', 'mountain view'],
      visionTags: [],
      source: 'fallback',
    },
    {
      id: 'demo-scrape-5',
      title: 'Lakeview Flat with Balcony',
      price: 540000,
      address: `22 Shoreline Dr, ${city}, ${state} 00000`,
      city,
      state,
      zip: '00000',
      beds: 2,
      baths: 1.5,
      sqft: 1100,
      lotSqft: 0,
      yearBuilt: 2004,
      stories: 1,
      garageSpaces: 1,
      hasRvParking: false,
      hasPool: true,
      hasWaterfront: true,
      hasView: true,
      hasBasement: false,
      hasFireplace: false,
      isNewBuild: false,
      isFixer: false,
      hasAdu: false,
      hoaFee: 580,
      propertyType: 'Condo',
      photoUrl: '',
      tags: ['lake view', 'balcony', 'doorman'],
      visionTags: [],
      source: 'fallback',
    },
  ];
}
