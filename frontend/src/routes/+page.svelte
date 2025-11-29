<script lang="ts">
  import { onMount } from 'svelte';

  type Listing = {
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

  export let data: { listings: Listing[] };
  let listings: Listing[] = data?.listings ?? [];
  let loading = false;
  let error = '';

  let filters = {
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    propertyType: '',
    tags: ''
  };

  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-family', 'Land'];

  const activeFilters = () => {
    const chips: string[] = [];
    if (filters.minPrice || filters.maxPrice) {
      chips.push(`$${filters.minPrice || '0'} - $${filters.maxPrice || 'any'}`);
    }
    if (filters.minBeds) chips.push(`${filters.minBeds}+ beds`);
    if (filters.minBaths) chips.push(`${filters.minBaths}+ baths`);
    if (filters.propertyType) chips.push(filters.propertyType);
    if (filters.tags) chips.push(`tags: ${filters.tags}`);
    return chips;
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.minPrice) params.set('min_price', filters.minPrice);
    if (filters.maxPrice) params.set('max_price', filters.maxPrice);
    if (filters.minBeds) params.set('min_beds', filters.minBeds);
    if (filters.minBaths) params.set('min_baths', filters.minBaths);
    if (filters.propertyType) params.set('property_type', filters.propertyType);
    if (filters.tags) params.set('tags', filters.tags);
    return params.toString();
  };

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

  onMount(runSearch);
</script>

<main class="min-h-screen bg-charcoal text-sand">
  <section class="relative overflow-hidden border-b border-white/5 bg-slate">
    <div class="absolute inset-0 bg-hero opacity-70"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-charcoal via-slate/80 to-charcoal"></div>
    <div class="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
      <div class="grid gap-10 lg:grid-cols-[1.2fr,1fr] lg:items-center">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.2em] text-mint">Home Finder</p>
          <h1 class="font-heading text-4xl font-semibold text-white sm:text-5xl">
            Modern, AI-assisted real estate search
          </h1>
          <p class="text-lg text-sand/80">
            Describe what you want—price, beds, type, must-have features—and we’ll surface listings that actually fit.
            We auto-tag photos when text is sparse, no uploads needed.
          </p>
          <div class="flex gap-3 text-sm text-sand/70">
            <span class="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-mint">AI vision tags</span>
            <span class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">Live filters</span>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-mint/80">Filters</p>
              <p class="font-heading text-xl font-semibold text-white">Dial in your search</p>
            </div>
            <button
              class="text-sm text-sand/60 underline decoration-mint/60 decoration-2 underline-offset-4"
              on:click={() => (filters = { minPrice: '', maxPrice: '', minBeds: '', minBaths: '', propertyType: '', tags: '' })}
            >
              Reset
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-sand/80">
              Price min
              <input
                type="number"
                min="0"
                placeholder="450000"
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.minPrice}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">
              Price max
              <input
                type="number"
                min="0"
                placeholder="800000"
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.maxPrice}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">
              Beds (min)
              <input
                type="number"
                min="0"
                placeholder="3"
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.minBeds}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80">
              Baths (min)
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="2"
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.minBaths}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80 md:col-span-2">
              Property type
              <select
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.propertyType}
              >
                <option value="">Any</option>
                {#each propertyTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </label>
            <label class="flex flex-col gap-2 text-sm text-sand/80 md:col-span-2">
              Must-have tags (comma separated)
              <input
                type="text"
                placeholder="garage, natural light, balcony"
                class="rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-white focus:border-mint focus:outline-none"
                bind:value={filters.tags}
              />
            </label>
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
            <button
              class="rounded-full border border-mint/40 bg-mint px-4 py-2 text-sm font-semibold text-charcoal transition hover:-translate-y-0.5 hover:shadow-card"
              on:click|preventDefault={runSearch}
              disabled={loading}
            >
              {#if loading}
                Searching...
              {:else}
                Run search
              {/if}
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
        <p class="text-sand/60 text-sm">Click “Run search” after adjusting filters. Tags use AI from listing photos when needed.</p>
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
              <img
                src={listing.photoUrl}
                alt={listing.title}
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div class="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-mint">
                <span>{listing.propertyType}</span>
              </div>
              <div class="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-charcoal">
                AI tags
              </div>
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-mint/80">{listing.city}, {listing.state}</p>
                  <h3 class="font-heading text-xl font-semibold text-white">{listing.title}</h3>
                  <p class="text-sm text-sand/70">{listing.address}</p>
                </div>
                <div class="text-right">
                  <p class="font-heading text-xl font-semibold text-mint">${listing.price.toLocaleString()}</p>
                  <p class="text-xs text-sand/60">{listing.beds} bd • {listing.baths} ba • {listing.sqft} sqft</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                {#each listing.tags as tag}
                  <span class="rounded-full bg-charcoal/80 px-3 py-1 text-xs text-sand/80 ring-1 ring-white/5">{tag}</span>
                {/each}
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