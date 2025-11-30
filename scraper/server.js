import express from 'express';
import { chromium, devices } from 'playwright';
import { LRUCache } from 'lru-cache';

const PORT = process.env.PORT || 3001;
const AUTH = process.env.SCRAPER_TOKEN || '';
const MAX_RESULTS = Number(process.env.SCRAPER_MAX_RESULTS || 40);
const HEADLESS = process.env.HEADLESS !== 'false';
const DEFAULT_PROVIDER = process.env.SCRAPER_DEFAULT_PROVIDER || 'zillow'; // zillow|redfin|realtor
const USER_AGENT =
  process.env.SCRAPER_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

  const provider = normalizeProvider(req.query.provider);

  const proxy = buildProxyConfig();
  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      userAgent: USER_AGENT,
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true,
      proxy: proxy || undefined,
    });
    const page = await context.newPage();
    attachLogging(page, provider);

    const targetUrl = await buildTargetUrl(req.query, provider, context.request);
    if (!targetUrl) {
      await browser.close();
      return res.status(400).json({ error: 'missing location (city/state or zip or q)' });
    }

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    await autoScroll(page, 3);

    let results = [];
    if (provider === 'redfin') {
      results = await extractRedfinCards(page, MAX_RESULTS);
    } else if (provider === 'realtor') {
      results = await extractRealtorCards(page, MAX_RESULTS);
    } else {
      await page.waitForSelector('[data-testid="property-card"]', { timeout: 20000 }).catch(() => {});
      results = await extractZillowCards(page, MAX_RESULTS);
    }
    await browser.close();

    const finalResults = results.length ? results : demoFallback(req.query);
    cache.set(key, finalResults);
    res.json({ results: finalResults, source: results.length ? provider : 'fallback', proxy: proxy ? 'used' : 'none' });
  } catch (err) {
    if (browser) await browser.close();
    console.error('scrape error', err);
    res.status(500).json({ error: 'scrape failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper listening on :${PORT}`);
});

function normalizeProvider(raw) {
  const val = (raw || DEFAULT_PROVIDER || 'zillow').toString().toLowerCase();
  if (['zillow', 'redfin', 'realtor'].includes(val)) return val;
  return 'zillow';
}

function buildProxyConfig() {
  const url = process.env.SCRAPER_PROXY_URL;
  if (url) {
    return { server: url };
  }
  const host = process.env.SCRAPER_PROXY_HOST;
  const port = process.env.SCRAPER_PROXY_PORT;
  if (!host || !port) return null;
  const user = process.env.SCRAPER_PROXY_USER;
  const pass = process.env.SCRAPER_PROXY_PASS;
  const auth = user ? `${user}:${pass || ''}@` : '';
  return { server: `http://${auth}${host}:${port}` };
}

async function buildTargetUrl(q, provider = 'zillow', requester) {
  const city = (q.city || '').trim();
  const state = (q.state || '').trim();
  const zip = (q.zip || '').trim();
  const query = (q.q || '').trim();

  if (provider === 'redfin') {
    const region = await lookupRedfinRegion(city, state, zip || query, requester);
    if (region?.url) return region.url;
    if (zip) return `https://www.redfin.com/zipcode/${encodeURIComponent(zip)}`;
    if (city && state) return `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(`${city}, ${state}`)}`;
    if (query) return `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(query)}`;
  }

  if (provider === 'realtor') {
    if (zip) return `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(zip)}`;
    if (city && state) return `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(city)}_${encodeURIComponent(state)}`;
    if (query) return `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(query)}`;
  }

  // default zillow
  if (zip) return `https://www.zillow.com/homes/${encodeURIComponent(zip)}_rb/`;
  if (city && state) return `https://www.zillow.com/homes/${encodeURIComponent(city)}-${encodeURIComponent(state)}/`;
  if (query) return `https://www.zillow.com/homes/${encodeURIComponent(query)}/`;
  return '';
}

async function lookupRedfinRegion(city, state, altQuery, requester) {
  const q = [city, state].filter(Boolean).join(', ') || altQuery;
  if (!q) return null;
  try {
    const url = `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(q)}&start=0&count=10&v=2`;
    const res = requester
      ? await requester.get(url, { headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.redfin.com/' } })
      : await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: 'https://www.redfin.com/',
          },
        });
    if (!res.ok) return null;
    const text = requester ? await res.text() : await res.text();
    const json = JSON.parse(text);
    const first = json?.payload?.sections?.flatMap((s) => s.rows || []).find((r) => r.id && r.url);
    if (!first) return null;
    return { id: first.id, url: `https://www.redfin.com${first.url}` };
  } catch (err) {
    console.warn('[redfin] autocomplete failed', err.message);
    return null;
  }
}

async function autoScroll(page, passes = 2) {
  for (let i = 0; i < passes; i++) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(1200 + Math.random() * 600);
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

async function extractRedfinCards(page, limit) {
  // Redfin uses dynamic scripts; target card-like containers with data-rf-test-id
  const cards = await page.$$eval('[data-rf-test-id=\"abp-card\"]', (nodes, limitInner) => {
    const toNumber = (txt) => {
      if (!txt) return 0;
      const digits = txt.replace(/[^0-9.]/g, '');
      return Number(digits || 0);
    };
    return nodes.slice(0, limitInner).map((node) => {
      const price = node.querySelector('[data-rf-test-id=\"abp-price\"]')?.textContent || '';
      const address = node.querySelector('[data-rf-test-id=\"abp-streetLine\"]')?.textContent || '';
      const cityStateZip = node.querySelector('[data-rf-test-id=\"abp-cityStateZip\"]')?.textContent || '';
      const meta = node.querySelector('[data-rf-test-id=\"abp-beds\"]')?.textContent || '';
      const baths = node.querySelector('[data-rf-test-id=\"abp-baths\"]')?.textContent || '';
      const sqft = node.querySelector('[data-rf-test-id=\"abp-sqFt\"]')?.textContent || '';
      const link = node.querySelector('a')?.getAttribute('href') || '';
      const img =
        node.querySelector('img')?.getAttribute('src') ||
        node.querySelector('img')?.getAttribute('data-src') ||
        '';
      const idMatch = link.match(/\/home\/([^\/]+)/);

      const [city = '', state = '', zip = ''] = (cityStateZip || '').split(',').map((p) => p.trim().replace(/\s+/g, ' '));

      return {
        id: idMatch ? idMatch[1] : link || Math.random().toString(36).slice(2),
        title: price?.trim() || 'Listing',
        price: toNumber(price),
        address,
        city,
        state,
        zip: zip.split(' ').pop() || '',
        beds: toNumber(meta),
        baths: baths ? parseFloat((baths.match(/[0-9.]+/) || [0])[0]) : 0,
        sqft: toNumber(sqft),
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
        tags: [],
        visionTags: [],
        source: 'redfin-scraper',
      };
    });
  }, limit);
  return cards;
}

async function extractRealtorCards(page, limit) {
  const cards = await page.$$eval('[data-testid=\"result-card\"]', (nodes, limitInner) => {
    const toNumber = (txt) => {
      if (!txt) return 0;
      const digits = txt.replace(/[^0-9.]/g, '');
      return Number(digits || 0);
    };
    const normalizeText = (el, sel) => (el.querySelector(sel)?.textContent || '').trim();
    return nodes.slice(0, limitInner).map((node) => {
      const price = normalizeText(node, '[data-testid=\"card-price\"]');
      const address = normalizeText(node, '[data-testid=\"card-address-1\"]');
      const cityStateZip = normalizeText(node, '[data-testid=\"card-address-2\"]');
      const beds = normalizeText(node, '[data-testid=\"property-meta-beds\"]');
      const baths = normalizeText(node, '[data-testid=\"property-meta-baths\"]');
      const sqft = normalizeText(node, '[data-testid=\"property-meta-sqft\"]');
      const link = node.querySelector('a')?.getAttribute('href') || '';
      const img =
        node.querySelector('img')?.getAttribute('src') ||
        node.querySelector('img')?.getAttribute('data-src') ||
        '';

      const [city = '', rest = ''] = (cityStateZip || '').split(',').map((p) => p.trim());
      const [state = '', zip = ''] = rest.split(' ').filter(Boolean);

      return {
        id: link || Math.random().toString(36).slice(2),
        title: price || 'Listing',
        price: toNumber(price),
        address,
        city,
        state,
        zip,
        beds: toNumber(beds),
        baths: baths ? parseFloat((baths.match(/[0-9.]+/) || [0])[0]) : 0,
        sqft: toNumber(sqft),
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
        tags: [],
        visionTags: [],
        source: 'realtor-scraper',
      };
    });
  }, limit);
  return cards;
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

function attachLogging(page, provider) {
  const start = Date.now();
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      console.warn(`[${provider}] HTTP ${resp.status()} ${resp.url().slice(0, 120)}`);
    }
  });
  page.on('requestfailed', (req) => {
    console.warn(`[${provider}] request failed ${req.url().slice(0, 120)} reason=${req.failure()?.errorText}`);
  });
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      console.warn(`[${provider}] console ${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('load', () => {
    console.info(`[${provider}] page load in ${Date.now() - start}ms`);
  });
}
