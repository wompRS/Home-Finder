<script lang="ts">
  import type { Listing } from './+page';
  import { onMount } from 'svelte';

  export let data: { listings: Listing[] };

  let listings: Listing[] = data?.listings ?? [];
  let loading = false;
  let error = '';

  const propertyOptions = ['Single Family', 'Condo', 'Townhouse', 'Multi-family', 'Land'];

  const emptyFilters = () => ({
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    minSqft: '',
    minLotSqft: '',
    minYear: '',
    maxYear: '',
    minStories: '',
    minGarage: '',
    maxHOA: '',
    propertyTypes: Object.fromEntries(propertyOptions.map((p) => [p, false])) as Record<string, boolean>,
    tags: '',
    excludeTags: '',
    city: '',
    state: '',
    zip: '',
    query: '',
    useVision: true,
    pool: false,
    waterfront: false,
    view: false,
    basement: false,
    fireplace: false,
    adu: false,
    rvParking: false,
    newBuild: false,
    fixer: false
  });

  let filters = emptyFilters();

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';
  const popularTags = ['rv garage', 'pool', 'fenced yard', 'balcony', 'waterfront', 'mountain view', 'guest house'];
  const commonExcludes = ['hoa', 'shared walls', 'street parking'];

  const selectedTypes = () => propertyOptions.filter((p) => filters.propertyTypes[p]);

  const activeFilters = () => {
    const chips: string[] = [];
    if (filters.minPrice || filters.maxPrice) chips.push(`$${filters.minPrice || '0'} - $${filters.maxPrice || 'any'}`);
    if (filters.minBeds) chips.push(`${filters.minBeds}+ beds`);
    if (filters.minBaths) chips.push(`${filters.minBaths}+ baths`);
    if (filters.minSqft) chips.push(`${filters.minSqft}+ sqft`);
    if (filters.minLotSqft) chips.push(`${filters.minLotSqft}+ lot sqft`);
    if (filters.minYear || filters.maxYear) chips.push(`Year ${filters.minYear || 'any'}-${filters.maxYear || 'any'}`);
    if (filters.minStories) chips.push(`${filters.minStories}+ stories`);
    if (filters.minGarage) chips.push(`${filters.minGarage}+ garage`);
    if (filters.maxHOA) chips.push(`HOA <= $${filters.maxHOA}`);
    selectedTypes().forEach((t) => chips.push(t));
    if (filters.city) chips.push(`City: ${filters.city}`);
    if (filters.state) chips.push(`State: ${filters.state}`);
    if (filters.zip) chips.push(`ZIP: ${filters.zip}`);
    if (filters.tags) chips.push(`tags: ${filters.tags}`);
    if (filters.excludeTags) chips.push(`exclude: ${filters.excludeTags}`);
    if (filters.query) chips.push(`search: ${filters.query}`);
    ['pool', 'waterfront', 'view', 'basement', 'fireplace', 'adu', 'rvParking', 'newBuild', 'fixer'].forEach((key) => {
      if ((filters as any)[key]) chips.push(key.replace(/([A-Z])/g, ' $1').toLowerCase());
    });
    if (filters.useVision) chips.push('AI image verification');
    return chips;
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.minPrice) params.set('min_price', filters.minPrice);
    if (filters.maxPrice) params.set('max_price', filters.maxPrice);
    if (filters.minBeds) params.set('min_beds', filters.minBeds);
    if (filters.minBaths) params.set('min_baths', filters.minBaths);
    if (filters.minSqft) params.set('min_sqft', filters.minSqft);
    if (filters.minLotSqft) params.set('min_lot_sqft', filters.minLotSqft);
    if (filters.minYear) params.set('min_year_built', filters.minYear);
    if (filters.maxYear) params.set('max_year_built', filters.maxYear);
    if (filters.minStories) params.set('min_stories', filters.minStories);
    if (filters.minGarage) params.set('min_garage', filters.minGarage);
    if (filters.maxHOA) params.set('max_hoa', filters.maxHOA);
    const types = selectedTypes();
    if (types.length) params.set('property_types', types.join(','));
    if (filters.tags) params.set('tags', filters.tags);
    if (filters.excludeTags) params.set('exclude_tags', filters.excludeTags);
    if (filters.city) params.set('city', filters.city);
    if (filters.state) params.set('state', filters.state);
    if (filters.zip) params.set('zip', filters.zip);
    if (filters.query) params.set('q', filters.query);
    if (filters.useVision) params.set('use_vision', '1');
    if (filters.pool) params.set('pool', '1');
    if (filters.waterfront) params.set('waterfront', '1');
    if (filters.view) params.set('view', '1');
    if (filters.basement) params.set('basement', '1');
    if (filters.fireplace) params.set('fireplace', '1');
    if (filters.adu) params.set('adu', '1');
    if (filters.rvParking) params.set('rv_parking', '1');
    if (filters.newBuild) params.set('new_build', '1');
    if (filters.fixer) params.set('fixer', '1');
    return params.toString();
  };

  const digitsOnly = (v: string, limit?: number) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    return limit ? cleaned.slice(0, limit) : cleaned;
  };

  const digitsDot = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  };

  const alphaOnly = (v: string, limit?: number) => {
    const cleaned = v.replace(/[^a-z]/gi, '');
    return limit ? cleaned.slice(0, limit) : cleaned;
  };

  const enforceDigits = (event: Event, setter: (v: string) => void, limit?: number) => {
    const input = event.currentTarget as HTMLInputElement;
    const cleaned = digitsOnly(input.value, limit);
    setter(cleaned);
    if (input.value !== cleaned) input.value = cleaned;
  };

  const enforceDecimal = (event: Event, setter: (v: string) => void) => {
    const input = event.currentTarget as HTMLInputElement;
    const cleaned = digitsDot(input.value);
    setter(cleaned);
    if (input.value !== cleaned) input.value = cleaned;
  };

  const enforceAlpha = (event: Event, setter: (v: string) => void, limit?: number) => {
    const input = event.currentTarget as HTMLInputElement;
    const cleaned = alphaOnly(input.value, limit);
    setter(cleaned);
    if (input.value !== cleaned) input.value = cleaned;
  };

  function addTag(tag: string) {
    const current = filters.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (!current.includes(tag)) {
      current.push(tag);
      filters.tags = current.join(', ');
    }
  }

  function addExclude(tag: string) {
    const current = filters.excludeTags.split(',').map((t) => t.trim()).filter(Boolean);
    if (!current.includes(tag)) {
      current.push(tag);
      filters.excludeTags = current.join(', ');
    }
  }

  async function runSearch() {
    loading = true;
    error = '';
    try {
      const qs = buildQuery();
      const res = await fetch(`${API_BASE}/search${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      listings = data.results ?? [];
    } catch (err) {
      console.error(err);
      error = 'Unable to fetch listings right now.';
    } finally {
      loading = false;
    }
  }

  function resetFilters() {
    filters = emptyFilters();
  }

  onMount(runSearch);
</script>

<main class="min-h-screen bg-charcoal text-sand">
  <section class="relative overflow-hidden border-b border-white/5 bg-slate">
    <div class="absolute inset-0 bg-hero opacity-70"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-charcoal via-slate/80 to-charcoal"></div>
    <div class="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
      <div class="grid gap-10 lg:grid-cols-[1.2fr,1fr] lg:items-start">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.2em] text-mint">Home Finder</p>
          <h1 class="font-heading text-4xl font-semibold text-white sm:text-5xl">Modern, AI-assisted real estate search</h1>
          <p class="text-lg text-sand/80">
            Deep filters plus AI vision verification for obvious visual features (garage/driveway, stories, pool, yard,
            waterfront/view, RV parking, ADU, etc.).
          </p>
          <div class="flex gap-3 text-sm text-sand/70">
            <span class="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-mint">AI vision tags</span>
            <span class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">Deep filters</span>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-mint/80">Filters</p>
              <p class="font-heading text-xl font-semibold text-white">Dial in your search</p>
            </div>
            <button class="text-sm text-sand/60 underline decoration-mint/60 decoration-2 underline-offset-4" on:click={resetFilters}>
              Reset
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-sand/80">Price min
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="450000" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minPrice} on:input={(e) => enforceDigits(e, (v) => (filters.minPrice = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Price max
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="1200000" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.maxPrice} on:input={(e) => enforceDigits(e, (v) => (filters.maxPrice = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Beds (min)
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="3" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minBeds} on:input={(e) => enforceDigits(e, (v) => (filters.minBeds = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Baths (min)
              <input type="number" min="0" step="0.5" inputmode="decimal" placeholder="2" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minBaths} on:input={(e) => enforceDecimal(e, (v) => (filters.minBaths = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Min sqft
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="1400" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minSqft} on:input={(e) => enforceDigits(e, (v) => (filters.minSqft = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Min lot sqft
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="5000" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minLotSqft} on:input={(e) => enforceDigits(e, (v) => (filters.minLotSqft = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Year built (min)
              <input type="number" min="1900" inputmode="numeric" pattern="[0-9]*" placeholder="1990" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minYear} on:input={(e) => enforceDigits(e, (v) => (filters.minYear = v), 4)} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Year built (max)
              <input type="number" min="1900" inputmode="numeric" pattern="[0-9]*" placeholder="2024" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.maxYear} on:input={(e) => enforceDigits(e, (v) => (filters.maxYear = v), 4)} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Stories (min)
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="1" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minStories} on:input={(e) => enforceDigits(e, (v) => (filters.minStories = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Garage spaces (min)
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="2" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.minGarage} on:input={(e) => enforceDigits(e, (v) => (filters.minGarage = v))} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">Max HOA ($/mo)
              <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="400" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.maxHOA} on:input={(e) => enforceDigits(e, (v) => (filters.maxHOA = v))} />
            </label>
            <div class="md:col-span-2">
              <p class="mb-2 text-sm text-sand/80">Property types</p>
              <div class="grid grid-cols-2 gap-2 text-sm text-sand/80">
                {#each propertyOptions as type}
                  <label class="flex items-center gap-2">
                    <input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.propertyTypes[type]} />{type}
                  </label>
                {/each}
              </div>
            </div>
            <label class="flex flex-col gap-2 text-sm text-sand/80">City
              <input type="text" placeholder="Austin" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.city} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">State
              <input type="text" placeholder="TX" maxlength="2" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.state} on:input={(e) => enforceAlpha(e, (v) => (filters.state = v.toUpperCase()), 2)} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">ZIP / area code
              <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="78704" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.zip} on:input={(e) => enforceDigits(e, (v) => (filters.zip = v), 10)} />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80 md:col-span-2">Must-have tags (comma separated)
              <input type="text" placeholder="rv garage, pool, fenced yard" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.tags} />
              <div class="flex flex-wrap gap-2 text-xs text-sand/60">
                {#each popularTags as tag}
                  <button type="button" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:border-mint/40 hover:text-mint" on:click={() => addTag(tag)}>
                    + {tag}
                  </button>
                {/each}
              </div>
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80 md:col-span-2">Exclude tags
              <input type="text" placeholder="hoa, shared walls" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.excludeTags} />
              <div class="flex flex-wrap gap-2 text-xs text-sand/60">
                {#each commonExcludes as tag}
                  <button type="button" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:border-mint/40 hover:text-mint" on:click={() => addExclude(tag)}>
                    × {tag}
                  </button>
                {/each}
              </div>
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80 md:col-span-2">Keywords (title/address/features)
              <input type="text" placeholder="craftsman, lake view, fenced yard" class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none" bind:value={filters.query} />
            </label>
            <div class="md:col-span-2 grid grid-cols-2 gap-3 text-sm text-sand/80">
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.pool} />Pool</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.waterfront} />Waterfront</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.view} />View</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.basement} />Basement</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.fireplace} />Fireplace</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.adu} />ADU/guest house</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.rvParking} />RV parking/garage</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.newBuild} />New build</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.fixer} />Fixer</label>
            </div>
            <div class="md:col-span-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p class="text-sm font-semibold text-white">Use AI image verification</p>
                <p class="text-xs text-sand/60">Verifies obvious visual features (pool, RV garage, stories, yard type, balcony) against photos when on.</p>
              </div>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-sand/80">
                <input type="checkbox" class="h-5 w-5 accent-mint" bind:checked={filters.useVision} />
                <span>{filters.useVision ? 'On' : 'Off'}</span>
              </label>
            </div>
          </div>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2">
              {#each activeFilters() as chip}
                <span class="rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs text-mint">{chip}</span>
              {/each}
              {#if activeFilters().length === 0}
                <span class="text-xs text-sand/60">No filters applied</span>
              {/if}
            </div>
            <button class="rounded-full border border-mint/40 bg-mint px-4 py-2 text-sm font-semibold text-charcoal transition hover:-translate-y-0.5 hover:shadow-card" on:click|preventDefault={runSearch} disabled={loading}>
              {#if loading}Searching...{:else}Run search{/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-6xl px-6 py-12">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-mint">Results</p>
        <h2 class="font-heading text-2xl font-semibold text-white">Handpicked matches</h2>
        <p class="text-sand/60 text-sm">Vision toggle verifies obvious visual features. Filters go beyond typical portals.</p>
      </div>
      <div class="flex items-center gap-3 text-xs text-sand/60">
        <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1">Live data (demo)</span>
      </div>
    </div>

    {#if error}
      <div class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
    {/if}

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#if listings.length === 0 && !loading}
        <p class="text-sand/70">No listings yet. Try broadening filters or connect a provider.</p>
      {:else if loading}
        <p class="text-sand/70">Loading results...</p>
      {:else}
        {#each listings as listing}
          <article class="group overflow-hidden rounded-2xl border border-white/5 bg-white/5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-mint/40 hover:shadow-[0_20px_60px_rgba(52,211,153,0.18)]">
            <div class="relative aspect-[4/3] overflow-hidden">
              <img src={listing.photoUrl} alt={listing.title} class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              <div class="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-mint">
                <span>{listing.propertyType}</span>
              </div>
              {#if filters.useVision}
                <div class="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-charcoal">AI tags</div>
              {/if}
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-mint/80">{listing.city}, {listing.state}</p>
                  <h3 class="font-heading text-xl font-semibold text-white">{listing.title}</h3>
                  <p class="text-sm text-sand/70">{listing.address}</p>
                  <p class="text-xs text-sand/60">Year {listing.yearBuilt} • {listing.stories} story • HOA ${listing.hoaFee || 0}</p>
                </div>
                <div class="text-right">
                  <p class="font-heading text-xl font-semibold text-mint">${listing.price.toLocaleString()}</p>
                  <p class="text-xs text-sand/60">{listing.beds} bd • {listing.baths} ba • {listing.sqft} sqft</p>
                  <p class="text-xs text-sand/50">Lot {listing.lotSqft} sqft</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                {#each listing.tags as tag}
                  <span class="rounded-full bg-charcoal/80 px-3 py-1 text-xs text-sand/80 ring-1 ring-white/5">{tag}</span>
                {/each}
                {#if filters.useVision && listing.visionTags}
                  {#each listing.visionTags as tag}
                    <span class="rounded-full bg-mint/15 px-3 py-1 text-xs text-mint ring-1 ring-mint/40">{tag}</span>
                  {/each}
                {/if}
              </div>
              <div class="flex items-center justify-between text-xs text-sand/60">
                <span>Source: {listing.source}</span>
                <button class="text-mint transition hover:text-white">View details</button>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </div>
  </section>
</main>
